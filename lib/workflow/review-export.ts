import type {
  BriefIntelligence,
  CopySystem,
  ExportDoc,
  OutputType,
  QAReview,
  ShotList,
  Territory,
  VisualDirection,
  WorkflowStageName,
} from "@/lib/agents/schemas";
import {
  BriefIntelligenceSchema,
  CopySystemSchema,
  ExportDocSchema,
  OutputTypeSchema,
  QAReviewSchema,
  ShotListSchema,
  TerritorySchema,
  VisualDirectionSchema,
} from "@/lib/agents/schemas";
import { createOpenAIClient } from "@/lib/ai/client";
import { generateQAReview as defaultGenerateQAReview, type QAReviewContext } from "@/lib/agents/qa-critic";
import { createSupabaseAdminClient } from "@/lib/db/supabase";
import { getRequiredServerEnv } from "@/lib/env";
import type { Json, Tables } from "@/types/database";

export type ReviewExportProjectSummary = Pick<Tables<"projects">, "id" | "slug" | "name" | "client_name" | "selected_territory_id">;

type StoredBriefOutput = { id: string; project_id: string; content: BriefIntelligence };
type StoredTerritoryOutput = { id: string; project_id: string; title: string; content: Territory };

export type StoredWorkflowOutput = {
  id: string;
  project_id: string;
  agent_run_id?: string | null;
  parent_output_id?: string | null;
  stage: WorkflowStageName;
  type: OutputType;
  title: string;
  content: Json;
  version: number;
  status?: "draft" | "selected" | "approved" | "archived";
};

export type StoredQAReviewOutput = StoredWorkflowOutput & { stage: "review"; type: "qa_review"; content: QAReview };
export type StoredExportDocOutput = StoredWorkflowOutput & { stage: "export"; type: "export_doc"; content: ExportDoc };

type AgentRunInsert = {
  project_id: string;
  agent_type: "qa_critic" | "export_agent";
  stage: "review" | "export";
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

type OutputInsert = {
  project_id: string;
  agent_run_id?: string | null;
  parent_output_id?: string | null;
  stage: "review" | "export";
  type: "qa_review" | "export_doc";
  title: string;
  content: Json;
  version?: number;
  status?: "draft" | "approved";
};

type StageUpdate = {
  project_id: string;
  stage: "review" | "export";
  status: "idle" | "in_progress" | "needs_review" | "complete" | "failed";
  summary: string;
};

type ActivityInsert = {
  project_id: string;
  type: string;
  message: string;
  metadata: Json;
};

export interface ReviewExportRepository {
  getProjectBySlug(slug: string): Promise<ReviewExportProjectSummary | null>;
  getLatestBriefIntelligence(projectId: string): Promise<StoredBriefOutput | null>;
  getSelectedTerritory(projectId: string, territoryId: string): Promise<StoredTerritoryOutput | null>;
  getProductionOutputs(projectId: string): Promise<StoredWorkflowOutput[]>;
  getProductionOutput(projectId: string, outputId: string): Promise<StoredWorkflowOutput | null>;
  getLatestQAReview(projectId: string): Promise<StoredQAReviewOutput | null>;
  getLatestExportDoc(projectId: string): Promise<StoredExportDocOutput | null>;
  createAgentRun(input: AgentRunInsert): Promise<{ id: string }>;
  updateAgentRun(id: string, update: AgentRunUpdate): Promise<void>;
  saveOutput(input: OutputInsert): Promise<StoredQAReviewOutput | StoredExportDocOutput>;
  updateOutputStatus(projectId: string, outputId: string, status: "draft" | "selected" | "approved" | "archived"): Promise<void>;
  updateWorkflowStage(input: StageUpdate): Promise<void>;
  logActivityEvent(input: ActivityInsert): Promise<void>;
}

function toJson(value: unknown): Json {
  return value as Json;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown review/export workflow error";
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

function parseOutputType(type: string): OutputType {
  return OutputTypeSchema.parse(type);
}

function parseOutputContent(type: OutputType, content: Json): Json {
  if (type === "brief_intelligence") return BriefIntelligenceSchema.parse(content) as Json;
  if (type === "territory") return TerritorySchema.parse(content) as Json;
  if (type === "copy_system") return CopySystemSchema.parse(content) as Json;
  if (type === "visual_direction") return VisualDirectionSchema.parse(content) as Json;
  if (type === "shot_list") return ShotListSchema.parse(content) as Json;
  if (type === "qa_review") return QAReviewSchema.parse(content) as Json;
  if (type === "export_doc") return ExportDocSchema.parse(content) as Json;
  return content;
}

function asStoredWorkflowOutput(row: {
  id: string;
  project_id: string;
  agent_run_id?: string | null;
  parent_output_id?: string | null;
  stage: WorkflowStageName;
  type: string;
  title: string;
  content: Json;
  version: number;
  status?: "draft" | "selected" | "approved" | "archived";
}): StoredWorkflowOutput {
  const type = parseOutputType(row.type);
  return { ...row, type, content: parseOutputContent(type, row.content) };
}

export function createSupabaseReviewExportRepository(client = createSupabaseAdminClient()): ReviewExportRepository {
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

    async getProductionOutputs(projectId) {
      const { data, error } = await client
        .from("outputs")
        .select("id, project_id, agent_run_id, parent_output_id, stage, type, title, content, version, status")
        .eq("project_id", projectId)
        .eq("stage", "production")
        .in("type", ["copy_system", "visual_direction", "shot_list"])
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data.map((row) => asStoredWorkflowOutput(row));
    },

    async getProductionOutput(projectId, outputId) {
      const { data, error } = await client
        .from("outputs")
        .select("id, project_id, agent_run_id, parent_output_id, stage, type, title, content, version, status")
        .eq("project_id", projectId)
        .eq("id", outputId)
        .eq("stage", "production")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return asStoredWorkflowOutput(data);
    },

    async getLatestQAReview(projectId) {
      const { data, error } = await client
        .from("outputs")
        .select("id, project_id, agent_run_id, parent_output_id, stage, type, title, content, version, status")
        .eq("project_id", projectId)
        .eq("stage", "review")
        .eq("type", "qa_review")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const output = asStoredWorkflowOutput(data);
      return { ...output, stage: "review", type: "qa_review", content: QAReviewSchema.parse(output.content) };
    },

    async getLatestExportDoc(projectId) {
      const { data, error } = await client
        .from("outputs")
        .select("id, project_id, agent_run_id, parent_output_id, stage, type, title, content, version, status")
        .eq("project_id", projectId)
        .eq("stage", "export")
        .eq("type", "export_doc")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const output = asStoredWorkflowOutput(data);
      return { ...output, stage: "export", type: "export_doc", content: ExportDocSchema.parse(output.content) };
    },

    async createAgentRun(input) {
      const { data, error } = await client.from("agent_runs").insert(input).select("id").single();
      if (error) throw new Error(error.message);
      return data;
    },

    async updateAgentRun(id, update) {
      const { error } = await client.from("agent_runs").update(update).eq("id", id);
      if (error) throw new Error(error.message);
    },

    async saveOutput(input) {
      const { data, error } = await client
        .from("outputs")
        .insert(input)
        .select("id, project_id, agent_run_id, parent_output_id, stage, type, title, content, version, status")
        .single();
      if (error) throw new Error(error.message);
      const output = asStoredWorkflowOutput(data);
      if (output.type === "qa_review") return { ...output, stage: "review", type: "qa_review", content: QAReviewSchema.parse(output.content) };
      return { ...output, stage: "export", type: "export_doc", content: ExportDocSchema.parse(output.content) };
    },

    async updateOutputStatus(projectId, outputId, status) {
      const { error } = await client.from("outputs").update({ status }).eq("project_id", projectId).eq("id", outputId);
      if (error) throw new Error(error.message);
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
  };
}

async function loadRequiredContext(input: { projectSlug: string; repository: ReviewExportRepository }) {
  const project = await input.repository.getProjectBySlug(input.projectSlug);
  if (!project) throw new Error(`Project not found: ${input.projectSlug}`);

  const briefOutput = await input.repository.getLatestBriefIntelligence(project.id);
  if (!briefOutput) throw new Error(`Brief intelligence is required before review/export for ${input.projectSlug}`);

  if (!project.selected_territory_id) throw new Error(`Selected territory is required before review/export for ${input.projectSlug}`);
  const territoryOutput = await input.repository.getSelectedTerritory(project.id, project.selected_territory_id);
  if (!territoryOutput) throw new Error(`Selected territory not found: ${project.selected_territory_id}`);

  return { project, briefOutput, territoryOutput };
}

export async function runQAReviewWorkflow(input: {
  projectSlug: string;
  outputId: string;
  model?: string;
  repository?: ReviewExportRepository;
  openAIClient?: QAReviewContext["openAIClient"];
  generateQAReview?: typeof defaultGenerateQAReview;
}) {
  const repository = input.repository ?? createSupabaseReviewExportRepository();
  const env = input.model ? null : getRequiredServerEnv();
  const model = input.model ?? env!.OPENAI_MODEL;
  const { project, briefOutput, territoryOutput } = await loadRequiredContext({ projectSlug: input.projectSlug, repository });
  const output = await repository.getProductionOutput(project.id, input.outputId);
  if (!output) throw new Error(`Output not found: ${input.outputId}`);

  const startedAt = Date.now();
  const agentRun = await repository.createAgentRun({
    project_id: project.id,
    agent_type: "qa_critic",
    stage: "review",
    status: "running",
    input: toJson({ output_id: output.id, output_type: output.type, selected_territory_id: territoryOutput.id }),
    model,
  });

  try {
    const review = await (input.generateQAReview ?? defaultGenerateQAReview)({
      project: { name: project.name, clientName: project.client_name },
      briefIntelligence: briefOutput.content,
      territory: territoryOutput.content,
      output: { id: output.id, type: output.type, title: output.title, content: output.content, version: output.version },
      model,
      openAIClient: input.openAIClient ?? (input.generateQAReview ? undefined as never : createOpenAIClient()),
    });

    const qaReview = await repository.saveOutput({
      project_id: project.id,
      agent_run_id: agentRun.id,
      stage: "review",
      type: "qa_review",
      title: `QA Review · ${output.title}`,
      content: toJson(review),
      version: 1,
      status: "draft",
    }) as StoredQAReviewOutput;

    await repository.updateAgentRun(agentRun.id, {
      status: "complete",
      output: toJson(review),
      error: null,
      duration_ms: Date.now() - startedAt,
      completed_at: new Date().toISOString(),
    });

    await repository.updateOutputStatus(project.id, output.id, review.verdict === "approve" ? "approved" : "draft");
    await repository.updateWorkflowStage({
      project_id: project.id,
      stage: "review",
      status: review.verdict === "approve" ? "complete" : "needs_review",
      summary: `QA review completed: ${review.verdict}.`,
    });
    await repository.updateWorkflowStage({
      project_id: project.id,
      stage: "export",
      status: "in_progress",
      summary: "Export ready after QA review.",
    });
    await repository.logActivityEvent({
      project_id: project.id,
      type: "review.completed",
      message: `QA review completed for ${output.title}`,
      metadata: toJson({ output_id: output.id, qa_review_id: qaReview.id, verdict: review.verdict }),
    });

    return { project, briefOutput, territoryOutput, output, qaReview };
  } catch (error) {
    await repository.updateAgentRun(agentRun.id, {
      status: "failed",
      error: errorMessage(error),
      duration_ms: Date.now() - startedAt,
      completed_at: new Date().toISOString(),
    });
    await repository.updateWorkflowStage({ project_id: project.id, stage: "review", status: "failed", summary: errorMessage(error) });
    await repository.logActivityEvent({ project_id: project.id, type: "review.failed", message: "QA review failed", metadata: toJson({ output_id: output.id, error: errorMessage(error) }) });
    throw error;
  }
}

function bullet(items: string[] | undefined) {
  if (!items?.length) return "- None";
  return items.map((item) => `- ${item}`).join("\n");
}

function isCopySystem(output: StoredWorkflowOutput): output is StoredWorkflowOutput & { type: "copy_system"; content: CopySystem } {
  return output.type === "copy_system";
}

function isVisualDirection(output: StoredWorkflowOutput): output is StoredWorkflowOutput & { type: "visual_direction"; content: VisualDirection } {
  return output.type === "visual_direction";
}

function isShotList(output: StoredWorkflowOutput): output is StoredWorkflowOutput & { type: "shot_list"; content: ShotList } {
  return output.type === "shot_list";
}

export function buildMarkdownExport(input: {
  project: ReviewExportProjectSummary;
  briefOutput: StoredBriefOutput;
  territoryOutput: StoredTerritoryOutput;
  productionOutputs: StoredWorkflowOutput[];
  qaReview?: StoredQAReviewOutput | null;
}) {
  const copies = input.productionOutputs.filter(isCopySystem);
  const visuals = input.productionOutputs.filter(isVisualDirection);
  const shots = input.productionOutputs.filter(isShotList);
  const qa = input.qaReview?.content;

  const copySection = copies.map((output) => [
    `### ${output.title} (v${output.version})`,
    "",
    "#### Hooks",
    bullet(output.content.hooks),
    "",
    "#### Scripts",
    output.content.scripts.length ? output.content.scripts.map((script) => `- ${script.title} (${script.duration}): ${script.voiceover}\n  - Beats: ${script.beats.join("; ")}`).join("\n") : "- None",
    "",
    "#### Captions",
    bullet(output.content.caption_options),
  ].join("\n")).join("\n\n");

  const visualSection = visuals.map((output) => [
    `### ${output.title} (v${output.version})`,
    "",
    output.content.visual_direction,
    "",
    "#### Image Prompts",
    bullet(output.content.image_prompts),
    "",
    "#### Video Prompts",
    bullet(output.content.video_prompts),
    "",
    "#### Do Rules",
    bullet(output.content.do_rules),
    "",
    "#### Don't Rules",
    bullet(output.content.dont_rules),
  ].join("\n")).join("\n\n");

  const shotSection = shots.map((output) => [
    `### ${output.title} (v${output.version})`,
    "",
    output.content.shot_list.length ? output.content.shot_list.map((shot) => `- ${shot.shot}: ${shot.purpose}\n  - Props: ${shot.props.join(", ") || "None"}\n  - Notes: ${shot.notes || "None"}`).join("\n") : "- None",
    "",
    "#### Deliverables",
    bullet(output.content.deliverables),
    "",
    "#### Production Risks",
    bullet(output.content.production_risks),
  ].join("\n")).join("\n\n");

  const qaSection = qa ? [
    `Verdict: ${qa.verdict}`,
    `Brand fit: ${qa.brand_fit}/100`,
    `Clarity: ${qa.clarity}/100`,
    `Novelty: ${qa.novelty}/100`,
    `Channel fit: ${qa.channel_fit}/100`,
    "",
    "### Issues",
    qa.issues.length ? qa.issues.map((issue) => `- [${issue.severity}] ${issue.title}: ${issue.body}\n  - Fix: ${issue.recommended_fix}`).join("\n") : "- None",
    "",
    "### Recommended Fixes",
    bullet(qa.recommended_fixes),
  ].join("\n") : "No QA review has been generated yet.";

  return [
    `# ${input.project.name}`,
    "",
    input.project.client_name ? `Client: ${input.project.client_name}` : null,
    `Project slug: ${input.project.slug}`,
    "",
    "## Brief Intelligence",
    "",
    `Audience: ${input.briefOutput.content.audience}`,
    `Core insight: ${input.briefOutput.content.core_insight}`,
    `Opportunity: ${input.briefOutput.content.opportunity}`,
    "",
    "### Risks",
    bullet(input.briefOutput.content.risks),
    "",
    "## Selected Territory",
    "",
    `### ${input.territoryOutput.content.name}`,
    input.territoryOutput.content.description,
    "",
    `Strategic angle: ${input.territoryOutput.content.strategic_angle}`,
    `Visual language: ${input.territoryOutput.content.visual_language}`,
    `Tone: ${input.territoryOutput.content.tone}`,
    "",
    "## Hooks & Scripts",
    "",
    copySection || "No copy system output available.",
    "",
    "## Visual Direction",
    "",
    visualSection || "No visual direction output available.",
    "",
    "## Shot List",
    "",
    shotSection || "No shot list output available.",
    "",
    "## QA Notes",
    "",
    qaSection,
    "",
  ].filter((line) => line !== null).join("\n");
}

export async function exportMarkdownWorkflow(input: {
  projectSlug: string;
  model?: string;
  repository?: ReviewExportRepository;
}) {
  const repository = input.repository ?? createSupabaseReviewExportRepository();
  const env = input.model ? null : getRequiredServerEnv();
  const model = input.model ?? env!.OPENAI_MODEL;
  const { project, briefOutput, territoryOutput } = await loadRequiredContext({ projectSlug: input.projectSlug, repository });
  const productionOutputs = await repository.getProductionOutputs(project.id);
  const qaReview = await repository.getLatestQAReview(project.id);

  const startedAt = Date.now();
  const agentRun = await repository.createAgentRun({
    project_id: project.id,
    agent_type: "export_agent",
    stage: "export",
    status: "running",
    input: toJson({ production_output_ids: productionOutputs.map((output) => output.id), qa_review_id: qaReview?.id ?? null }),
    model,
  });

  try {
    const markdown = buildMarkdownExport({ project, briefOutput, territoryOutput, productionOutputs, qaReview });
    const content: ExportDoc = { format: "markdown", markdown };
    const exportDoc = await repository.saveOutput({
      project_id: project.id,
      agent_run_id: agentRun.id,
      stage: "export",
      type: "export_doc",
      title: `Markdown Handoff · ${project.name}`,
      content: toJson(content),
      version: 1,
      status: "approved",
    }) as StoredExportDocOutput;

    await repository.updateAgentRun(agentRun.id, {
      status: "complete",
      output: toJson(content),
      error: null,
      duration_ms: Date.now() - startedAt,
      completed_at: new Date().toISOString(),
    });
    await repository.updateWorkflowStage({ project_id: project.id, stage: "export", status: "complete", summary: "Markdown export created." });
    await repository.logActivityEvent({ project_id: project.id, type: "export.created", message: "Markdown export created", metadata: toJson({ export_doc_id: exportDoc.id }) });

    return { project, briefOutput, territoryOutput, productionOutputs, qaReview, exportDoc };
  } catch (error) {
    await repository.updateAgentRun(agentRun.id, { status: "failed", error: errorMessage(error), duration_ms: Date.now() - startedAt, completed_at: new Date().toISOString() });
    await repository.updateWorkflowStage({ project_id: project.id, stage: "export", status: "failed", summary: errorMessage(error) });
    await repository.logActivityEvent({ project_id: project.id, type: "export.failed", message: "Markdown export failed", metadata: toJson({ error: errorMessage(error) }) });
    throw error;
  }
}

export async function getReviewWorkspace(projectSlug: string, repository: ReviewExportRepository = createSupabaseReviewExportRepository()) {
  const project = await repository.getProjectBySlug(projectSlug);
  if (!project) return null;
  const [productionOutputs, qaReview] = await Promise.all([
    repository.getProductionOutputs(project.id),
    repository.getLatestQAReview(project.id),
  ]);
  return { project, productionOutputs, qaReview };
}

export async function getExportWorkspace(projectSlug: string, repository: ReviewExportRepository = createSupabaseReviewExportRepository()) {
  const project = await repository.getProjectBySlug(projectSlug);
  if (!project) return null;
  const [productionOutputs, qaReview, exportDoc] = await Promise.all([
    repository.getProductionOutputs(project.id),
    repository.getLatestQAReview(project.id),
    repository.getLatestExportDoc(project.id),
  ]);
  return { project, productionOutputs, qaReview, exportDoc };
}
