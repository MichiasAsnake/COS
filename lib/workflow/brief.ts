import type { BriefIntelligence, AgentType, WorkflowStageName } from "@/lib/agents/schemas";
import type { Json, Tables } from "@/types/database";
import { generateBriefIntelligence as defaultGenerateBriefIntelligence } from "@/lib/agents/brief-intelligence";
import { createOpenAIClient } from "@/lib/ai/client";
import { getRequiredServerEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/db/supabase";

export type ProjectSummary = Pick<Tables<"projects">, "id" | "slug" | "name" | "client_name">;

type BriefInputInsert = {
  project_id: string;
  type: "brief";
  content: string;
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

type OutputInsert = {
  project_id: string;
  agent_run_id: string;
  stage: "brief";
  type: "brief_intelligence";
  title: string;
  content: BriefIntelligence;
  status: "draft";
};

type WorkflowStageUpdate = {
  project_id: string;
  stage: "brief";
  status: "complete" | "failed";
  summary: string;
};

type ActivityInsert = {
  project_id: string;
  type: string;
  message: string;
  metadata: Json;
};

export interface BriefWorkflowRepository {
  getProjectBySlug(slug: string): Promise<ProjectSummary | null>;
  saveBriefInput(input: BriefInputInsert): Promise<{ id: string }>;
  createAgentRun(input: AgentRunInsert): Promise<{ id: string }>;
  updateAgentRun(id: string, update: AgentRunUpdate): Promise<void>;
  saveOutput(input: OutputInsert): Promise<{ id: string }>;
  updateWorkflowStage(input: WorkflowStageUpdate): Promise<void>;
  logActivityEvent(input: ActivityInsert): Promise<void>;
}

export interface BriefWorkspaceRepository {
  getProjectBySlug(slug: string): Promise<ProjectSummary | null>;
  getLatestBriefInput(projectId: string): Promise<Tables<"project_inputs"> | null>;
  getLatestBriefOutput(projectId: string): Promise<Tables<"outputs"> | null>;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown brief intelligence error";
}

function toJson(value: unknown): Json {
  return value as Json;
}

export function createSupabaseBriefRepository(client = createSupabaseAdminClient()): BriefWorkflowRepository & BriefWorkspaceRepository {
  return {
    async getProjectBySlug(slug) {
      const { data, error } = await client
        .from("projects")
        .select("id, slug, name, client_name")
        .eq("slug", slug)
        .single();

      if (error) {
        if ("code" in error && error.code === "PGRST116") return null;
        throw new Error(error.message);
      }

      return data;
    },

    async saveBriefInput(input) {
      const { data, error } = await client
        .from("project_inputs")
        .insert(input)
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      return data;
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
        .insert({ ...input, content: toJson(input.content) })
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      return data;
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

    async getLatestBriefInput(projectId) {
      const { data, error } = await client
        .from("project_inputs")
        .select("*")
        .eq("project_id", projectId)
        .eq("type", "brief")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },

    async getLatestBriefOutput(projectId) {
      const { data, error } = await client
        .from("outputs")
        .select("*")
        .eq("project_id", projectId)
        .eq("stage", "brief")
        .eq("type", "brief_intelligence")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },
  };
}

export async function runBriefIntelligenceWorkflow(input: {
  projectSlug: string;
  rawBrief: string;
  model?: string;
  repository?: BriefWorkflowRepository;
  openAIClient?: Parameters<typeof defaultGenerateBriefIntelligence>[0]["openAIClient"];
  generateBriefIntelligence?: typeof defaultGenerateBriefIntelligence;
}) {
  const repository = input.repository ?? createSupabaseBriefRepository();
  const env = input.model ? null : getRequiredServerEnv();
  const model = input.model ?? env!.OPENAI_MODEL;
  const project = await repository.getProjectBySlug(input.projectSlug);

  if (!project) {
    throw new Error(`Project not found: ${input.projectSlug}`);
  }

  const savedInput = await repository.saveBriefInput({
    project_id: project.id,
    type: "brief",
    content: input.rawBrief,
  });

  const runStartedAt = Date.now();
  const agentRun = await repository.createAgentRun({
    project_id: project.id,
    agent_type: "brief_intelligence",
    stage: "brief",
    status: "running",
    input: toJson({ project_slug: project.slug, input_id: savedInput.id, raw_brief: input.rawBrief }),
    model,
  });

  const generate = input.generateBriefIntelligence ?? defaultGenerateBriefIntelligence;

  try {
    const content = await generate({
      rawBrief: input.rawBrief,
      project: { name: project.name, clientName: project.client_name },
      model,
      openAIClient: input.openAIClient ?? (input.generateBriefIntelligence ? undefined as never : createOpenAIClient()),
    });

    const output = await repository.saveOutput({
      project_id: project.id,
      agent_run_id: agentRun.id,
      stage: "brief",
      type: "brief_intelligence",
      title: "Brief Intelligence",
      content,
      status: "draft",
    });

    await repository.updateAgentRun(agentRun.id, {
      status: "complete",
      output: toJson(content),
      error: null,
      duration_ms: Date.now() - runStartedAt,
      completed_at: new Date().toISOString(),
    });

    await repository.updateWorkflowStage({
      project_id: project.id,
      stage: "brief",
      status: "complete",
      summary: content.core_insight,
    });

    await repository.logActivityEvent({
      project_id: project.id,
      type: "agent_run.completed",
      message: "Brief Intelligence completed",
      metadata: toJson({ agent_run_id: agentRun.id, output_id: output.id, stage: "brief" }),
    });

    return { project, input: savedInput, agentRun, output: { ...output, content } };
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
      stage: "brief",
      status: "failed",
      summary: message,
    });

    await repository.logActivityEvent({
      project_id: project.id,
      type: "agent_run.failed",
      message: "Brief Intelligence failed",
      metadata: toJson({ agent_run_id: agentRun.id, stage: "brief", error: message }),
    });

    throw error;
  }
}

export async function getBriefWorkspace(projectSlug: string, repository: BriefWorkspaceRepository = createSupabaseBriefRepository()) {
  const project = await repository.getProjectBySlug(projectSlug);
  if (!project) return null;

  const [input, output] = await Promise.all([
    repository.getLatestBriefInput(project.id),
    repository.getLatestBriefOutput(project.id),
  ]);

  return { project, input, output };
}
