import { z } from "zod";
import { NextResponse } from "next/server";
import { ProjectSlugSchema } from "@/lib/agents/schemas";
import { getRequiredServerEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/db/supabase";
import { getBriefWorkspace, runBriefIntelligenceWorkflow as defaultRunBriefIntelligenceWorkflow } from "@/lib/workflow/brief";
import type { Inserts, Tables } from "@/types/database";
import type { OutputSummary, ProjectSummary, ProjectWorkspaceData, WorkflowStageSummary } from "@/types/projects";

const CreateProjectRequestSchema = z.object({
  name: z.string().trim().min(3).max(120),
  clientName: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
});

const ParseBriefRequestSchema = z.object({
  rawBrief: z.string().trim().min(40, "Paste at least 40 characters so the brief agent has enough context."),
});

export function slugifyProjectName(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);

  return ProjectSlugSchema.parse(slug || "untitled-project");
}

const INITIAL_WORKFLOW_STAGES = ["brief", "direction", "production", "review", "export"] as const;
const PROJECT_SELECT = "id, slug, name, description, client_name, status, selected_territory_id, created_at, updated_at";
const STAGE_ORDER = ["brief", "direction", "production", "review", "export"] as const;

function sortStages(stages: WorkflowStageSummary[]) {
  return [...stages].sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProjectBySlug(slug: string): Promise<ProjectSummary | null> {
  const parsed = ProjectSlugSchema.safeParse(slug);
  if (!parsed.success) return null;
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("slug", parsed.data)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getProjectWorkspaceData(slug: string): Promise<ProjectWorkspaceData | null> {
  const project = await getProjectBySlug(slug);
  if (!project) return null;

  const client = createSupabaseAdminClient();
  const [projectsResult, stagesResult, outputsResult] = await Promise.all([
    client
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("status", "active")
      .order("updated_at", { ascending: false }),
    client
      .from("workflow_stages")
      .select("id, project_id, stage, status, summary, updated_at")
      .eq("project_id", project.id),
    client
      .from("outputs")
      .select("id, project_id, stage, type, title, content, status, version, created_at, updated_at")
      .eq("project_id", project.id)
      .order("updated_at", { ascending: false })
      .limit(12),
  ]);

  if (projectsResult.error) throw new Error(projectsResult.error.message);
  if (stagesResult.error) throw new Error(stagesResult.error.message);
  if (outputsResult.error) throw new Error(outputsResult.error.message);

  return {
    project,
    projects: projectsResult.data ?? [],
    stages: sortStages((stagesResult.data ?? []) as WorkflowStageSummary[]),
    outputs: (outputsResult.data ?? []) as OutputSummary[],
  };
}

export async function createProject(input: Inserts<"projects">): Promise<Tables<"projects">> {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("projects")
    .insert(input)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const initialStages: Inserts<"workflow_stages">[] = INITIAL_WORKFLOW_STAGES.map((stage) => ({
    project_id: data.id,
    stage,
    status: stage === "brief" ? "in_progress" : "idle",
    summary: stage === "brief" ? "Ready for brief intelligence" : null,
  }));

  const { error: stagesError } = await client
    .from("workflow_stages")
    .insert(initialStages);

  if (stagesError) throw new Error(stagesError.message);

  const { error: activityError } = await client
    .from("activity_events")
    .insert({
      project_id: data.id,
      type: "project.created",
      message: `Project created: ${data.name}`,
      metadata: { slug: data.slug },
    });

  if (activityError) throw new Error(activityError.message);

  return data;
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function coerceErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown server error";
}

type ProjectCreator = (input: Inserts<"projects">) => Promise<unknown>;
type BriefWorkflowRunner = (input: Parameters<typeof defaultRunBriefIntelligenceWorkflow>[0]) => Promise<unknown>;

export async function handleListProjectsRequest(deps: { listProjects?: () => Promise<ProjectSummary[]> } = {}) {
  try {
    const load = deps.listProjects ?? listProjects;
    const projects = await load();
    return NextResponse.json({ projects });
  } catch (error) {
    const message = coerceErrorMessage(error);
    const status = message.includes("not configured") ? 503 : 500;
    return errorResponse(message, status);
  }
}

export async function handleCreateProjectRequest(
  request: Request,
  deps: { createProject?: ProjectCreator } = {},
) {
  const parsed = CreateProjectRequestSchema.safeParse(await safeJson(request));
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid project payload");
  }

  const create = deps.createProject ?? createProject;
  const payload = parsed.data;
  const project = await create({
    slug: slugifyProjectName(payload.name),
    name: payload.name,
    description: payload.description ?? null,
    client_name: payload.clientName ?? null,
  });

  return NextResponse.json({ project }, { status: 201 });
}

export async function handleParseBriefRequest(
  request: Request,
  deps: {
    projectSlug: string;
    model?: string;
    runBriefIntelligenceWorkflow?: BriefWorkflowRunner;
  },
) {
  const parsed = ParseBriefRequestSchema.safeParse(await safeJson(request));
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid brief payload");
  }

  try {
    const workflow = deps.runBriefIntelligenceWorkflow ?? defaultRunBriefIntelligenceWorkflow;
    const model = deps.model ?? getRequiredServerEnv().OPENAI_MODEL;
    const result = await workflow({
      projectSlug: deps.projectSlug,
      rawBrief: parsed.data.rawBrief,
      model,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = coerceErrorMessage(error);
    const status = message.includes("not configured") ? 503 : message.includes("not found") ? 404 : 500;
    return errorResponse(message, status);
  }
}

export async function handleGetBriefRequest(deps: { projectSlug: string }) {
  try {
    const workspace = await getBriefWorkspace(deps.projectSlug);
    if (!workspace) return errorResponse(`Project not found: ${deps.projectSlug}`, 404);
    return NextResponse.json(workspace);
  } catch (error) {
    const message = coerceErrorMessage(error);
    const status = message.includes("not configured") ? 503 : 500;
    return errorResponse(message, status);
  }
}
