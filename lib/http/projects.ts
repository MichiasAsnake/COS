import { z } from "zod";
import { NextResponse } from "next/server";
import { ProjectSlugSchema } from "@/lib/agents/schemas";
import { getRequiredServerEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/db/supabase";
import { getBriefWorkspace, runBriefIntelligenceWorkflow as defaultRunBriefIntelligenceWorkflow } from "@/lib/workflow/brief";
import type { Inserts, Tables } from "@/types/database";

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
