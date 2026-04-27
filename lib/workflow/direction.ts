import type { AgentType, BriefIntelligence, Territory, WorkflowStageName } from "@/lib/agents/schemas";
import { BriefIntelligenceSchema, TerritorySchema } from "@/lib/agents/schemas";
import type { Json, Tables } from "@/types/database";
import { generateCreativeTerritories as defaultGenerateCreativeTerritories } from "@/lib/agents/creative-director";
import { createOpenAIClient } from "@/lib/ai/client";
import { createSupabaseAdminClient } from "@/lib/db/supabase";
import { getRequiredServerEnv } from "@/lib/env";

export type DirectionProjectSummary = Pick<Tables<"projects">, "id" | "slug" | "name" | "client_name" | "selected_territory_id">;

export type BriefIntelligenceOutput = {
  id: string;
  project_id: string;
  content: BriefIntelligence;
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

type TerritoryOutputInsert = {
  project_id: string;
  agent_run_id: string;
  stage: "direction";
  type: "territory";
  title: string;
  content: Territory;
  status: "draft";
};

type StageUpdate = {
  project_id: string;
  stage: "direction" | "production";
  status: "needs_review" | "complete" | "failed" | "in_progress";
  summary: string;
};

type ActivityInsert = {
  project_id: string;
  type: string;
  message: string;
  metadata: Json;
};

export interface DirectionWorkflowRepository {
  getProjectBySlug(slug: string): Promise<DirectionProjectSummary | null>;
  getLatestBriefIntelligence(projectId: string): Promise<BriefIntelligenceOutput | null>;
  createAgentRun(input: AgentRunInsert): Promise<{ id: string }>;
  updateAgentRun(id: string, update: AgentRunUpdate): Promise<void>;
  saveTerritoryOutput(input: TerritoryOutputInsert): Promise<{ id: string; title?: string; content?: Territory }>;
  updateWorkflowStage(input: StageUpdate): Promise<void>;
  logActivityEvent(input: ActivityInsert): Promise<void>;
  getTerritoryOutput(projectId: string, territoryId: string): Promise<{ id: string; project_id: string; title: string; content: Territory } | null>;
  selectTerritory(input: { project_id: string; territory_id: string }): Promise<void>;
}

export interface DirectionWorkspaceRepository {
  getProjectBySlug(slug: string): Promise<DirectionProjectSummary | null>;
  getTerritoryOutputs(projectId: string): Promise<Tables<"outputs">[]>;
}

function toJson(value: unknown): Json {
  return value as Json;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Creative Director error";
}

function parseBriefContent(content: Json): BriefIntelligence {
  const parsed = BriefIntelligenceSchema.safeParse(content);
  if (!parsed.success) {
    throw new Error(`Stored brief intelligence failed validation: ${parsed.error.issues.map((issue) => issue.path.join(".") || issue.message).join(", ")}`);
  }
  return parsed.data;
}

function parseTerritoryContent(content: Json): Territory {
  const parsed = TerritorySchema.safeParse(content);
  if (!parsed.success) {
    throw new Error(`Stored territory failed validation: ${parsed.error.issues.map((issue) => issue.path.join(".") || issue.message).join(", ")}`);
  }
  return parsed.data;
}

export function createSupabaseDirectionRepository(client = createSupabaseAdminClient()): DirectionWorkflowRepository & DirectionWorkspaceRepository {
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

      return {
        id: data.id,
        project_id: data.project_id,
        content: parseBriefContent(data.content),
      };
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

    async saveTerritoryOutput(input) {
      const { data, error } = await client
        .from("outputs")
        .insert({ ...input, content: toJson(input.content) })
        .select("id, title, content")
        .single();

      if (error) throw new Error(error.message);
      return { id: data.id, title: data.title, content: parseTerritoryContent(data.content) };
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
      const { error } = await client
        .from("activity_events")
        .insert(input);

      if (error) throw new Error(error.message);
    },

    async getTerritoryOutput(projectId, territoryId) {
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
      return { id: data.id, project_id: data.project_id, title: data.title, content: parseTerritoryContent(data.content) };
    },

    async selectTerritory(input) {
      const { error: projectError } = await client
        .from("projects")
        .update({ selected_territory_id: input.territory_id })
        .eq("id", input.project_id);
      if (projectError) throw new Error(projectError.message);

      const { error: resetError } = await client
        .from("outputs")
        .update({ status: "draft" })
        .eq("project_id", input.project_id)
        .eq("stage", "direction")
        .eq("type", "territory");
      if (resetError) throw new Error(resetError.message);

      const { error: selectedError } = await client
        .from("outputs")
        .update({ status: "selected" })
        .eq("project_id", input.project_id)
        .eq("id", input.territory_id);
      if (selectedError) throw new Error(selectedError.message);
    },

    async getTerritoryOutputs(projectId) {
      const { data, error } = await client
        .from("outputs")
        .select("*")
        .eq("project_id", projectId)
        .eq("stage", "direction")
        .eq("type", "territory")
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);
      return data;
    },
  };
}

export async function runCreativeTerritoriesWorkflow(input: {
  projectSlug: string;
  model?: string;
  repository?: DirectionWorkflowRepository;
  openAIClient?: Parameters<typeof defaultGenerateCreativeTerritories>[0]["openAIClient"];
  generateCreativeTerritories?: typeof defaultGenerateCreativeTerritories;
}) {
  const repository = input.repository ?? createSupabaseDirectionRepository();
  const env = input.model ? null : getRequiredServerEnv();
  const model = input.model ?? env!.OPENAI_MODEL;
  const project = await repository.getProjectBySlug(input.projectSlug);

  if (!project) throw new Error(`Project not found: ${input.projectSlug}`);

  const briefOutput = await repository.getLatestBriefIntelligence(project.id);
  if (!briefOutput) throw new Error(`Brief intelligence is required before generating territories for ${input.projectSlug}`);

  const runStartedAt = Date.now();
  const agentRun = await repository.createAgentRun({
    project_id: project.id,
    agent_type: "creative_director",
    stage: "direction",
    status: "running",
    input: toJson({ project_slug: project.slug, brief_output_id: briefOutput.id, brief_intelligence: briefOutput.content }),
    model,
  });

  const generate = input.generateCreativeTerritories ?? defaultGenerateCreativeTerritories;

  try {
    const territories = await generate({
      briefIntelligence: briefOutput.content,
      project: { name: project.name, clientName: project.client_name },
      model,
      openAIClient: input.openAIClient ?? (input.generateCreativeTerritories ? undefined as never : createOpenAIClient()),
    });

    const outputs = [];
    for (const territory of territories) {
      outputs.push(await repository.saveTerritoryOutput({
        project_id: project.id,
        agent_run_id: agentRun.id,
        stage: "direction",
        type: "territory",
        title: territory.name,
        content: territory,
        status: "draft",
      }));
    }

    await repository.updateAgentRun(agentRun.id, {
      status: "complete",
      output: toJson({ territories }),
      error: null,
      duration_ms: Date.now() - runStartedAt,
      completed_at: new Date().toISOString(),
    });

    await repository.updateWorkflowStage({
      project_id: project.id,
      stage: "direction",
      status: "needs_review",
      summary: `${territories.length} territories generated; select one to unlock production.`,
    });

    await repository.logActivityEvent({
      project_id: project.id,
      type: "agent_run.completed",
      message: `Creative Director generated ${territories.length} territories`,
      metadata: toJson({ agent_run_id: agentRun.id, output_ids: outputs.map((output) => output.id), stage: "direction" }),
    });

    return { project, briefOutput, agentRun, outputs };
  } catch (error) {
    const message = errorMessage(error);

    await repository.updateAgentRun(agentRun.id, {
      status: "failed",
      error: message,
      duration_ms: Date.now() - runStartedAt,
      completed_at: new Date().toISOString(),
    });

    await repository.updateWorkflowStage({
      project_id: project.id,
      stage: "direction",
      status: "failed",
      summary: message,
    });

    await repository.logActivityEvent({
      project_id: project.id,
      type: "agent_run.failed",
      message: "Creative Director failed",
      metadata: toJson({ agent_run_id: agentRun.id, stage: "direction", error: message }),
    });

    throw error;
  }
}

export async function selectTerritoryWorkflow(input: {
  projectSlug: string;
  territoryId: string;
  repository?: DirectionWorkflowRepository;
}) {
  const repository = input.repository ?? createSupabaseDirectionRepository();
  const project = await repository.getProjectBySlug(input.projectSlug);

  if (!project) throw new Error(`Project not found: ${input.projectSlug}`);

  const selectedTerritory = await repository.getTerritoryOutput(project.id, input.territoryId);
  if (!selectedTerritory) throw new Error(`Territory not found: ${input.territoryId}`);

  await repository.selectTerritory({ project_id: project.id, territory_id: input.territoryId });

  await repository.updateWorkflowStage({
    project_id: project.id,
    stage: "direction",
    status: "complete",
    summary: `Selected territory: ${selectedTerritory.title}`,
  });

  await repository.updateWorkflowStage({
    project_id: project.id,
    stage: "production",
    status: "in_progress",
    summary: "Ready to generate production system.",
  });

  await repository.logActivityEvent({
    project_id: project.id,
    type: "territory.selected",
    message: `Selected territory: ${selectedTerritory.title}`,
    metadata: toJson({ territory_id: selectedTerritory.id, stage: "direction" }),
  });

  return {
    project: { ...project, selected_territory_id: selectedTerritory.id },
    selectedTerritory,
  };
}

export async function getDirectionWorkspace(projectSlug: string, repository: DirectionWorkspaceRepository = createSupabaseDirectionRepository()) {
  const project = await repository.getProjectBySlug(projectSlug);
  if (!project) return null;

  const territories = await repository.getTerritoryOutputs(project.id);
  return { project, territories };
}
