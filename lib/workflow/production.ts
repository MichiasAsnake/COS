import type {
  AgentType,
  BriefIntelligence,
  CopySystem,
  OutputType,
  ShotList,
  Territory,
  VisualDirection,
  WorkflowStageName,
} from "@/lib/agents/schemas";
import {
  BriefIntelligenceSchema,
  CopySystemSchema,
  OutputTypeSchema,
  ShotListSchema,
  TerritorySchema,
  VisualDirectionSchema,
} from "@/lib/agents/schemas";
import type { Json, Tables } from "@/types/database";
import {
  generateCopySystem as defaultGenerateCopySystem,
  generateShotList as defaultGenerateShotList,
  generateVisualDirection as defaultGenerateVisualDirection,
  reviseProductionOutput as defaultReviseProductionOutput,
  type ProductionAgentContext,
} from "@/lib/agents/production-system";
import { createOpenAIClient } from "@/lib/ai/client";
import { createSupabaseAdminClient } from "@/lib/db/supabase";
import { getRequiredServerEnv } from "@/lib/env";

export type ProductionProjectSummary = Pick<Tables<"projects">, "id" | "slug" | "name" | "client_name" | "selected_territory_id">;

type StoredBriefOutput = { id: string; project_id: string; content: BriefIntelligence };
type StoredTerritoryOutput = { id: string; project_id: string; title: string; content: Territory };

export type StoredProductionOutput = {
  id: string;
  project_id: string;
  agent_run_id?: string | null;
  parent_output_id?: string | null;
  stage: "production";
  type: OutputType;
  title: string;
  content: Json;
  version: number;
  status?: "draft" | "selected" | "approved" | "archived";
};

type AgentRunInsert = {
  project_id: string;
  agent_type: AgentType;
  stage: WorkflowStageName;
  status: "running";
  input: Json;
  model: string;
};

type AgentRunUpdate = {
  status: "complete" | "failed";
  output?: Json | null;
  error?: string | null;
  duration_ms?: number | null;
  completed_at?: string;
};

type ProductionOutputInsert = {
  project_id: string;
  agent_run_id?: string | null;
  parent_output_id?: string | null;
  stage: "production";
  type: "copy_system" | "visual_direction" | "shot_list";
  title: string;
  content: Json;
  version?: number;
  status: "draft";
};

type StageUpdate = {
  project_id: string;
  stage: "production" | "review";
  status: "needs_review" | "complete" | "failed" | "in_progress";
  summary: string;
};

type ActivityInsert = {
  project_id: string;
  type: string;
  message: string;
  metadata: Json;
};

type FeedbackInsert = {
  project_id: string;
  output_id: string;
  feedback_type: string;
  instruction?: string | null;
  before: Json;
  after: Json;
};

export interface ProductionWorkflowRepository {
  getProjectBySlug(slug: string): Promise<ProductionProjectSummary | null>;
  getLatestBriefIntelligence(projectId: string): Promise<StoredBriefOutput | null>;
  getSelectedTerritory(projectId: string, territoryId: string): Promise<StoredTerritoryOutput | null>;
  createAgentRun(input: AgentRunInsert): Promise<{ id: string }>;
  updateAgentRun(id: string, update: AgentRunUpdate): Promise<void>;
  saveOutput(input: ProductionOutputInsert): Promise<StoredProductionOutput>;
  updateWorkflowStage(input: StageUpdate): Promise<void>;
  logActivityEvent(input: ActivityInsert): Promise<void>;
  getProductionOutputs(projectId: string): Promise<StoredProductionOutput[]>;
  getOutput(projectId: string, outputId: string): Promise<StoredProductionOutput | null>;
  logFeedbackEvent(input: FeedbackInsert): Promise<void>;
}

function toJson(value: unknown): Json {
  return value as Json;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown production workflow error";
}

function parseBrief(content: Json): BriefIntelligence {
  const parsed = BriefIntelligenceSchema.safeParse(content);
  if (!parsed.success) throw new Error("Stored brief intelligence failed validation");
  return parsed.data;
}

function parseTerritory(content: Json): Territory {
  const parsed = TerritorySchema.safeParse(content);
  if (!parsed.success) throw new Error("Stored selected territory failed validation");
  return parsed.data;
}

function parseProductionOutputType(type: string): OutputType {
  return OutputTypeSchema.parse(type);
}

function parseProductionContent(type: OutputType, content: Json): Json {
  if (type === "copy_system") return CopySystemSchema.parse(content) as Json;
  if (type === "visual_direction") return VisualDirectionSchema.parse(content) as Json;
  if (type === "shot_list") return ShotListSchema.parse(content) as Json;
  return content;
}

export function createSupabaseProductionRepository(client = createSupabaseAdminClient()): ProductionWorkflowRepository {
  return {
    async getProjectBySlug(slug) {
      const { data, error } = await client
        .from("projects")
        .select("id, slug, name, client_name, selected_territory_id")
        .eq("slug", slug)
        .single();
      if (error) {
        if ("code" in error && error.code === "PGRST116") return null;
        throw new Error(error.message);
      }
      return data;
    },

    async getLatestBriefIntelligence(projectId) {
      const { data, error } = await client
        .from("outputs")
        .select("id, project_id, content")
        .eq("project_id", projectId)
        .eq("stage", "brief")
        .eq("type", "brief_intelligence")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return { id: data.id, project_id: data.project_id, content: parseBrief(data.content) };
    },

    async getSelectedTerritory(projectId, territoryId) {
      const { data, error } = await client
        .from("outputs")
        .select("id, project_id, title, content")
        .eq("project_id", projectId)
        .eq("id", territoryId)
        .eq("stage", "direction")
        .eq("type", "territory")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return { id: data.id, project_id: data.project_id, title: data.title, content: parseTerritory(data.content) };
    },

    async createAgentRun(input) {
      const { data, error } = await client
        .from("agent_runs")
        .insert(input)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    async updateAgentRun(id, update) {
      const { error } = await client
        .from("agent_runs")
        .update(update)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async saveOutput(input) {
      const { data, error } = await client
        .from("outputs")
        .insert(input)
        .select("id, project_id, agent_run_id, parent_output_id, stage, type, title, content, version, status")
        .single();
      if (error) throw new Error(error.message);
      const type = parseProductionOutputType(data.type);
      return { ...data, stage: "production", type, content: parseProductionContent(type, data.content) };
    },

    async updateWorkflowStage(input) {
      const { error } = await client
        .from("workflow_stages")
        .update({ status: input.status, summary: input.summary })
        .eq("project_id", input.project_id)
        .eq("stage", input.stage);
      if (error) throw new Error(error.message);
    },

    async logActivityEvent(input) {
      const { error } = await client.from("activity_events").insert(input);
      if (error) throw new Error(error.message);
    },

    async getProductionOutputs(projectId) {
      const { data, error } = await client
        .from("outputs")
        .select("id, project_id, agent_run_id, parent_output_id, stage, type, title, content, version, status")
        .eq("project_id", projectId)
        .eq("stage", "production")
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data.map((row) => {
        const type = parseProductionOutputType(row.type);
        return { ...row, stage: "production", type, content: parseProductionContent(type, row.content) };
      });
    },

    async getOutput(projectId, outputId) {
      const { data, error } = await client
        .from("outputs")
        .select("id, project_id, agent_run_id, parent_output_id, stage, type, title, content, version, status")
        .eq("project_id", projectId)
        .eq("id", outputId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const type = parseProductionOutputType(data.type);
      return { ...data, stage: "production", type, content: parseProductionContent(type, data.content) };
    },

    async logFeedbackEvent(input) {
      const { error } = await client.from("feedback_events").insert(input);
      if (error) throw new Error(error.message);
    },
  };
}

async function runProductionAgent<T extends CopySystem | VisualDirection | ShotList>(input: {
  repository: ProductionWorkflowRepository;
  project: ProductionProjectSummary;
  briefIntelligence: BriefIntelligence;
  territoryOutput: StoredTerritoryOutput;
  agentType: "copywriter" | "art_director" | "production_planner";
  outputType: "copy_system" | "visual_direction" | "shot_list";
  title: string;
  model: string;
  openAIClient?: ProductionAgentContext["openAIClient"];
  createClientForDefaultAgent?: boolean;
  generate: (context: ProductionAgentContext) => Promise<T>;
}) {
  const startedAt = Date.now();
  const agentRun = await input.repository.createAgentRun({
    project_id: input.project.id,
    agent_type: input.agentType,
    stage: "production",
    status: "running",
    input: toJson({
      project_slug: input.project.slug,
      selected_territory_id: input.territoryOutput.id,
      territory: input.territoryOutput.content,
      brief_intelligence: input.briefIntelligence,
    }),
    model: input.model,
  });

  try {
    const content = await input.generate({
      project: { name: input.project.name, clientName: input.project.client_name },
      briefIntelligence: input.briefIntelligence,
      territory: input.territoryOutput.content,
      model: input.model,
      openAIClient: input.openAIClient ?? (input.createClientForDefaultAgent ? createOpenAIClient() : undefined as never),
    });

    const output = await input.repository.saveOutput({
      project_id: input.project.id,
      agent_run_id: agentRun.id,
      stage: "production",
      type: input.outputType,
      title: input.title,
      content: toJson(content),
      version: 1,
      status: "draft",
    });

    await input.repository.updateAgentRun(agentRun.id, {
      status: "complete",
      output: toJson(content),
      error: null,
      duration_ms: Date.now() - startedAt,
      completed_at: new Date().toISOString(),
    });

    return output;
  } catch (error) {
    await input.repository.updateAgentRun(agentRun.id, {
      status: "failed",
      error: errorMessage(error),
      duration_ms: Date.now() - startedAt,
      completed_at: new Date().toISOString(),
    });
    throw error;
  }
}

export async function runProductionSystemWorkflow(input: {
  projectSlug: string;
  model?: string;
  repository?: ProductionWorkflowRepository;
  openAIClient?: ProductionAgentContext["openAIClient"];
  generateCopySystem?: typeof defaultGenerateCopySystem;
  generateVisualDirection?: typeof defaultGenerateVisualDirection;
  generateShotList?: typeof defaultGenerateShotList;
}) {
  const repository = input.repository ?? createSupabaseProductionRepository();
  const env = input.model ? null : getRequiredServerEnv();
  const model = input.model ?? env!.OPENAI_MODEL;
  const project = await repository.getProjectBySlug(input.projectSlug);

  if (!project) throw new Error(`Project not found: ${input.projectSlug}`);
  if (!project.selected_territory_id) throw new Error(`Selected territory is required before production for ${input.projectSlug}`);

  const briefOutput = await repository.getLatestBriefIntelligence(project.id);
  if (!briefOutput) throw new Error(`Brief intelligence is required before production for ${input.projectSlug}`);

  const territoryOutput = await repository.getSelectedTerritory(project.id, project.selected_territory_id);
  if (!territoryOutput) throw new Error(`Selected territory not found: ${project.selected_territory_id}`);

  try {
    const shared = { repository, project, briefIntelligence: briefOutput.content, territoryOutput, model, openAIClient: input.openAIClient };
    const copy = await runProductionAgent({
      ...shared,
      agentType: "copywriter",
      outputType: "copy_system",
      title: `Copy System · ${territoryOutput.title}`,
      generate: input.generateCopySystem ?? defaultGenerateCopySystem,
      createClientForDefaultAgent: !input.generateCopySystem,
    });
    const visual = await runProductionAgent({
      ...shared,
      agentType: "art_director",
      outputType: "visual_direction",
      title: `Visual Direction · ${territoryOutput.title}`,
      generate: input.generateVisualDirection ?? defaultGenerateVisualDirection,
      createClientForDefaultAgent: !input.generateVisualDirection,
    });
    const shots = await runProductionAgent({
      ...shared,
      agentType: "production_planner",
      outputType: "shot_list",
      title: `Shot List · ${territoryOutput.title}`,
      generate: input.generateShotList ?? defaultGenerateShotList,
      createClientForDefaultAgent: !input.generateShotList,
    });

    const outputs = [copy, visual, shots];

    await repository.updateWorkflowStage({
      project_id: project.id,
      stage: "production",
      status: "needs_review",
      summary: "Production system generated: copy, visual direction, and shot list.",
    });

    await repository.logActivityEvent({
      project_id: project.id,
      type: "production.generated",
      message: "Production system generated",
      metadata: toJson({ output_ids: outputs.map((output) => output.id), selected_territory_id: territoryOutput.id }),
    });

    return { project, briefOutput, territoryOutput, outputs };
  } catch (error) {
    await repository.updateWorkflowStage({
      project_id: project.id,
      stage: "production",
      status: "failed",
      summary: errorMessage(error),
    });
    await repository.logActivityEvent({
      project_id: project.id,
      type: "production.failed",
      message: "Production system failed",
      metadata: toJson({ error: errorMessage(error), selected_territory_id: territoryOutput.id }),
    });
    throw error;
  }
}

export async function applyFeedbackWorkflow(input: {
  projectSlug: string;
  outputId: string;
  feedbackType: string;
  instruction?: string | null;
  model?: string;
  repository?: ProductionWorkflowRepository;
  openAIClient?: ProductionAgentContext["openAIClient"];
  reviseOutput?: typeof defaultReviseProductionOutput;
}) {
  const repository = input.repository ?? createSupabaseProductionRepository();
  const env = input.model ? null : getRequiredServerEnv();
  const model = input.model ?? env!.OPENAI_MODEL;
  const project = await repository.getProjectBySlug(input.projectSlug);

  if (!project) throw new Error(`Project not found: ${input.projectSlug}`);

  const output = await repository.getOutput(project.id, input.outputId);
  if (!output) throw new Error(`Output not found: ${input.outputId}`);

  const revise = input.reviseOutput ?? defaultReviseProductionOutput;
  const after = await revise({
    output: { id: input.outputId, type: output.type, title: output.title, content: output.content, version: output.version },
    feedbackType: input.feedbackType,
    instruction: input.instruction ?? null,
    model,
    openAIClient: input.openAIClient ?? (input.reviseOutput ? undefined as never : createOpenAIClient()),
  });

  const revisedOutput = await repository.saveOutput({
    project_id: project.id,
    agent_run_id: null,
    parent_output_id: output.id,
    stage: "production",
    type: output.type as "copy_system" | "visual_direction" | "shot_list",
    title: `${output.title} · v${output.version + 1}`,
    content: after,
    version: output.version + 1,
    status: "draft",
  });

  await repository.logFeedbackEvent({
    project_id: project.id,
    output_id: output.id,
    feedback_type: input.feedbackType,
    instruction: input.instruction ?? null,
    before: output.content,
    after,
  });

  await repository.logActivityEvent({
    project_id: project.id,
    type: "feedback.applied",
    message: `Applied feedback: ${input.feedbackType}`,
    metadata: toJson({ output_id: output.id, revised_output_id: revisedOutput.id, feedback_type: input.feedbackType }),
  });

  return { project, output, revisedOutput };
}

export async function getProductionWorkspace(projectSlug: string, repository: ProductionWorkflowRepository = createSupabaseProductionRepository()) {
  const project = await repository.getProjectBySlug(projectSlug);
  if (!project) return null;
  const outputs = await repository.getProductionOutputs(project.id);
  return { project, outputs };
}
