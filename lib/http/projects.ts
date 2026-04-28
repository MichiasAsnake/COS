import { z } from "zod";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ProjectSlugSchema } from "@/lib/agents/schemas";
import { getRequiredServerEnv } from "@/lib/env";
import { createSupabaseAdminClient, createSupabasePublicClient } from "@/lib/db/supabase";
import { allocateProjectSlug, projectSlugCandidates } from "@/lib/project-lifecycle";
import { getBriefWorkspace, runBriefIntelligenceWorkflow as defaultRunBriefIntelligenceWorkflow } from "@/lib/workflow/brief";
import type { Database, Inserts, Tables } from "@/types/database";
import type {
  ActivityEventSummary,
  AgentRunSummary,
  FeedbackEventSummary,
  OutputSummary,
  ProjectSummary,
  ProjectWorkspaceData,
  WorkflowStageSummary,
} from "@/types/projects";

const CreateProjectRequestSchema = z.object({
  name: z.string().trim().min(3).max(120),
  clientName: z.string().trim().min(1, "Client / brand name is required.").max(120),
  description: z.string().trim().min(10, "Describe the project objective in at least 10 characters.").max(500),
  initialBrief: z.string().trim().min(40, "Paste at least 40 characters for the initial brief.").max(10000),
});

const UpdateProjectRequestSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  clientName: z.string().trim().min(1).max(120).optional().nullable(),
  description: z.string().trim().min(10).max(500).optional().nullable(),
}).refine((payload) => Object.values(payload).some((value) => value !== undefined), "Provide a project field to update.");

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
  const client = createSupabasePublicClient();
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
  const client = createSupabasePublicClient();
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

  const client = createSupabasePublicClient();
  const [projectsResult, stagesResult, outputsResult, agentRunsResult, activityEventsResult, feedbackEventsResult] = await Promise.all([
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
    client
      .from("agent_runs")
      .select("id, project_id, agent_type, stage, status, error, model, created_at, completed_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(8),
    client
      .from("activity_events")
      .select("id, project_id, type, message, metadata, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(10),
    client
      .from("feedback_events")
      .select("id, project_id, output_id, feedback_type, instruction, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  if (projectsResult.error) throw new Error(projectsResult.error.message);
  if (stagesResult.error) throw new Error(stagesResult.error.message);
  if (outputsResult.error) throw new Error(outputsResult.error.message);
  if (agentRunsResult.error) throw new Error(agentRunsResult.error.message);
  if (activityEventsResult.error) throw new Error(activityEventsResult.error.message);
  if (feedbackEventsResult.error) throw new Error(feedbackEventsResult.error.message);

  return {
    project,
    projects: projectsResult.data ?? [],
    stages: sortStages((stagesResult.data ?? []) as WorkflowStageSummary[]),
    outputs: (outputsResult.data ?? []) as OutputSummary[],
    agentRuns: (agentRunsResult.data ?? []) as AgentRunSummary[],
    activityEvents: (activityEventsResult.data ?? []) as ActivityEventSummary[],
    feedbackEvents: (feedbackEventsResult.data ?? []) as FeedbackEventSummary[],
  };
}

async function getAvailableProjectSlug(
  client: SupabaseClient<Database>,
  baseSlug: string,
  excludeProjectId?: string,
) {
  const candidates = projectSlugCandidates(baseSlug, 20);
  let query = client
    .from("projects")
    .select("id, slug")
    .in("slug", candidates);

  if (excludeProjectId) query = query.neq("id", excludeProjectId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const used = new Set((data ?? []).map((project) => project.slug));
  const available = allocateProjectSlug(baseSlug, used);
  if (candidates.includes(available)) return available;

  for (let suffix = 21; suffix < 1000; suffix += 1) {
    const [candidate] = projectSlugCandidates(baseSlug, suffix).slice(-1);
    let candidateQuery = client
      .from("projects")
      .select("id")
      .eq("slug", candidate);

    if (excludeProjectId) candidateQuery = candidateQuery.neq("id", excludeProjectId);

    const { data: existing, error: candidateError } = await candidateQuery.maybeSingle();
    if (candidateError) throw new Error(candidateError.message);
    if (!existing) return candidate;
  }

  throw new Error(`Could not allocate a unique slug for ${baseSlug}`);
}

export type CreateProjectInput = Inserts<"projects"> & {
  initialBrief?: string | null;
};

export async function createProject(input: CreateProjectInput): Promise<Tables<"projects">> {
  const client = createSupabaseAdminClient();
  const { initialBrief, ...projectInput } = input;
  const slug = await getAvailableProjectSlug(client, projectInput.slug);
  const { data, error } = await client
    .from("projects")
    .insert({ ...projectInput, slug })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const initialStages: Inserts<"workflow_stages">[] = INITIAL_WORKFLOW_STAGES.map((stage) => ({
    project_id: data.id,
    stage,
    status: stage === "brief" ? "in_progress" : "idle",
    summary: stage === "brief"
      ? initialBrief
        ? "Initial brief saved; ready for Brief Intelligence."
        : "Ready for Brief Intelligence."
      : null,
  }));

  const { error: stagesError } = await client
    .from("workflow_stages")
    .upsert(initialStages, { onConflict: "project_id,stage" });

  if (stagesError) throw new Error(stagesError.message);

  if (initialBrief) {
    const { error: inputError } = await client
      .from("project_inputs")
      .insert({
        project_id: data.id,
        type: "brief",
        content: initialBrief,
      });

    if (inputError) throw new Error(inputError.message);
  }

  const { error: activityError } = await client
    .from("activity_events")
    .insert({
      project_id: data.id,
      type: "project.created",
      message: `Project created: ${data.name}`,
      metadata: { slug: data.slug, initial_brief_saved: Boolean(initialBrief) },
    });

  if (activityError) throw new Error(activityError.message);

  return data;
}

export async function updateProjectBySlug(
  slug: string,
  input: {
    name?: string;
    clientName?: string | null;
    description?: string | null;
  },
): Promise<Tables<"projects"> | null> {
  const parsedSlug = ProjectSlugSchema.safeParse(slug);
  if (!parsedSlug.success) return null;

  const client = createSupabaseAdminClient();
  const current = await getProjectBySlug(parsedSlug.data);
  if (!current) return null;

  const nextName = input.name ?? current.name;
  if (input.name !== undefined && input.name === current.name && input.clientName === undefined && input.description === undefined) {
    throw new Error("Project name must be different from the current name.");
  }

  const nextSlug = input.name && input.name !== current.name
    ? await getAvailableProjectSlug(client, slugifyProjectName(input.name), current.id)
    : current.slug;

  const update: Inserts<"projects"> = {
    slug: nextSlug,
    name: nextName,
    client_name: input.clientName === undefined ? current.client_name : input.clientName,
    description: input.description === undefined ? current.description : input.description,
  };

  const { data, error } = await client
    .from("projects")
    .update(update)
    .eq("id", current.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const { error: activityError } = await client
    .from("activity_events")
    .insert({
      project_id: current.id,
      type: "project.updated",
      message: nextSlug !== current.slug ? `Project renamed: ${data.name}` : `Project updated: ${data.name}`,
      metadata: { previous_slug: current.slug, slug: nextSlug },
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

function projectErrorResponse(error: unknown, fallback: string) {
  const message = coerceErrorMessage(error);
  const lower = message.toLowerCase();
  if (message.includes("not configured")) return errorResponse(message, 503);
  if (lower.includes("duplicate") || lower.includes("unique") || lower.includes("could not allocate")) {
    return errorResponse("A project with that slug already exists. Retry to allocate a unique slug.", 409);
  }
  if (lower.includes("must be different") || lower.includes("invalid project slug")) return errorResponse(message, 400);
  if (lower.includes("not found")) return errorResponse(message, 404);
  return errorResponse(fallback, 500);
}

type ProjectCreator = (input: CreateProjectInput) => Promise<unknown>;
type BriefWorkflowRunner = (input: Parameters<typeof defaultRunBriefIntelligenceWorkflow>[0]) => Promise<unknown>;

export async function handleListProjectsRequest(deps: { listProjects?: () => Promise<ProjectSummary[]> } = {}) {
  try {
    const load = deps.listProjects ?? listProjects;
    const projects = await load();
    return NextResponse.json({ projects });
  } catch (error) {
    return projectErrorResponse(error, "Projects could not be loaded. Check configuration and retry.");
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
  try {
    const project = await create({
      slug: slugifyProjectName(payload.name),
      name: payload.name,
      description: payload.description,
      client_name: payload.clientName,
      initialBrief: payload.initialBrief,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return projectErrorResponse(error, "Project could not be created. Check the fields and retry.");
  }
}

export async function handleUpdateProjectRequest(
  request: Request,
  deps: {
    projectSlug: string;
    updateProject?: typeof updateProjectBySlug;
  },
) {
  const parsedSlug = ProjectSlugSchema.safeParse(deps.projectSlug);
  if (!parsedSlug.success) return errorResponse("Invalid project slug.", 400);

  const parsed = UpdateProjectRequestSchema.safeParse(await safeJson(request));
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid project update payload");
  }

  try {
    const updateProject = deps.updateProject ?? updateProjectBySlug;
    const project = await updateProject(parsedSlug.data, parsed.data);
    if (!project) return errorResponse(`Project not found: ${parsedSlug.data}`, 404);
    return NextResponse.json({ project });
  } catch (error) {
    return projectErrorResponse(error, "Project could not be updated. Check the name and retry.");
  }
}

export async function handleGetProjectWorkspaceRequest(
  deps: {
    projectSlug: string;
    getProjectWorkspaceData?: typeof getProjectWorkspaceData;
  },
) {
  const parsedSlug = ProjectSlugSchema.safeParse(deps.projectSlug);
  if (!parsedSlug.success) return errorResponse("Invalid project slug.", 400);

  try {
    const load = deps.getProjectWorkspaceData ?? getProjectWorkspaceData;
    const workspace = await load(parsedSlug.data);
    if (!workspace) return errorResponse(`Project not found: ${parsedSlug.data}`, 404);
    return NextResponse.json(workspace);
  } catch (error) {
    return projectErrorResponse(error, "Project workspace could not be loaded. Check configuration and retry.");
  }
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
