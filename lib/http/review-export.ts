import { z } from "zod";
import { NextResponse } from "next/server";
import { getRequiredServerEnv } from "@/lib/env";
import {
  exportMarkdownWorkflow as defaultExportMarkdownWorkflow,
  getExportWorkspace as defaultGetExportWorkspace,
  getReviewWorkspace as defaultGetReviewWorkspace,
  runQAReviewWorkflow as defaultRunQAReviewWorkflow,
} from "@/lib/workflow/review-export";

const RunQAReviewRequestSchema = z.object({
  outputId: z.string().trim().min(1, "outputId is required"),
});

type ReviewWorkspaceLoader = (projectSlug: string) => Promise<unknown>;
type ExportWorkspaceLoader = (projectSlug: string) => Promise<unknown>;
type QAReviewRunner = (input: Parameters<typeof defaultRunQAReviewWorkflow>[0]) => Promise<unknown>;
type ExportRunner = (input: Parameters<typeof defaultExportMarkdownWorkflow>[0]) => Promise<unknown>;

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

function statusForError(message: string) {
  if (message.includes("not configured")) return 503;
  if (message.includes("not found") || message.includes("Project not found") || message.includes("Output not found")) return 404;
  if (message.includes("required before review/export") || message.includes("Selected territory")) return 409;
  return 500;
}

export async function handleGetReviewRequest(deps: {
  projectSlug: string;
  getReviewWorkspace?: ReviewWorkspaceLoader;
}) {
  try {
    const load = deps.getReviewWorkspace ?? defaultGetReviewWorkspace;
    const workspace = await load(deps.projectSlug);
    if (!workspace) return errorResponse(`Project not found: ${deps.projectSlug}`, 404);
    return NextResponse.json(workspace);
  } catch (error) {
    const message = coerceErrorMessage(error);
    return errorResponse(message, statusForError(message));
  }
}

export async function handleRunQAReviewRequest(
  request: Request,
  deps: {
    projectSlug: string;
    model?: string;
    runQAReviewWorkflow?: QAReviewRunner;
  },
) {
  const parsed = RunQAReviewRequestSchema.safeParse(await safeJson(request));
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid QA review payload");
  }

  try {
    const workflow = deps.runQAReviewWorkflow ?? defaultRunQAReviewWorkflow;
    const model = deps.model ?? getRequiredServerEnv().OPENAI_MODEL;
    const result = await workflow({ projectSlug: deps.projectSlug, outputId: parsed.data.outputId, model });
    return NextResponse.json(result);
  } catch (error) {
    const message = coerceErrorMessage(error);
    return errorResponse(message, statusForError(message));
  }
}

export async function handleGetExportRequest(deps: {
  projectSlug: string;
  getExportWorkspace?: ExportWorkspaceLoader;
}) {
  try {
    const load = deps.getExportWorkspace ?? defaultGetExportWorkspace;
    const workspace = await load(deps.projectSlug);
    if (!workspace) return errorResponse(`Project not found: ${deps.projectSlug}`, 404);
    return NextResponse.json(workspace);
  } catch (error) {
    const message = coerceErrorMessage(error);
    return errorResponse(message, statusForError(message));
  }
}

export async function handleExportMarkdownRequest(deps: {
  projectSlug: string;
  model?: string;
  exportMarkdownWorkflow?: ExportRunner;
}) {
  try {
    const workflow = deps.exportMarkdownWorkflow ?? defaultExportMarkdownWorkflow;
    const model = deps.model ?? getRequiredServerEnv().OPENAI_MODEL;
    const result = await workflow({ projectSlug: deps.projectSlug, model });
    return NextResponse.json(result);
  } catch (error) {
    const message = coerceErrorMessage(error);
    return errorResponse(message, statusForError(message));
  }
}
