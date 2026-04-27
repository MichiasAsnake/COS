import { z } from "zod";
import { NextResponse } from "next/server";
import { getRequiredServerEnv } from "@/lib/env";
import {
  applyFeedbackWorkflow as defaultApplyFeedbackWorkflow,
  getProductionWorkspace as defaultGetProductionWorkspace,
  runProductionSystemWorkflow as defaultRunProductionSystemWorkflow,
} from "@/lib/workflow/production";

const ApplyFeedbackRequestSchema = z.object({
  outputId: z.string().trim().min(1, "outputId is required"),
  feedbackType: z.enum([
    "make_more_premium",
    "less_generic",
    "more_playful",
    "more_tiktok_native",
    "client_safe",
    "shorter",
    "more_visual",
  ]),
  instruction: z.string().trim().max(500).optional().nullable(),
});

type ProductionWorkspaceLoader = (projectSlug: string) => Promise<unknown>;
type ProductionRunner = (input: Parameters<typeof defaultRunProductionSystemWorkflow>[0]) => Promise<unknown>;
type FeedbackRunner = (input: Parameters<typeof defaultApplyFeedbackWorkflow>[0]) => Promise<unknown>;

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
  if (message.includes("required before production") || message.includes("Selected territory")) return 409;
  return 500;
}

export async function handleGetProductionRequest(deps: {
  projectSlug: string;
  getProductionWorkspace?: ProductionWorkspaceLoader;
}) {
  try {
    const load = deps.getProductionWorkspace ?? defaultGetProductionWorkspace;
    const workspace = await load(deps.projectSlug);
    if (!workspace) return errorResponse(`Project not found: ${deps.projectSlug}`, 404);
    return NextResponse.json(workspace);
  } catch (error) {
    const message = coerceErrorMessage(error);
    return errorResponse(message, statusForError(message));
  }
}

export async function handleGenerateProductionRequest(deps: {
  projectSlug: string;
  model?: string;
  runProductionSystemWorkflow?: ProductionRunner;
}) {
  try {
    const workflow = deps.runProductionSystemWorkflow ?? defaultRunProductionSystemWorkflow;
    const model = deps.model ?? getRequiredServerEnv().OPENAI_MODEL;
    const result = await workflow({ projectSlug: deps.projectSlug, model });
    return NextResponse.json(result);
  } catch (error) {
    const message = coerceErrorMessage(error);
    return errorResponse(message, statusForError(message));
  }
}

export async function handleApplyFeedbackRequest(
  request: Request,
  deps: {
    projectSlug: string;
    model?: string;
    applyFeedbackWorkflow?: FeedbackRunner;
  },
) {
  const parsed = ApplyFeedbackRequestSchema.safeParse(await safeJson(request));
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid feedback payload");
  }

  try {
    const workflow = deps.applyFeedbackWorkflow ?? defaultApplyFeedbackWorkflow;
    const model = deps.model ?? getRequiredServerEnv().OPENAI_MODEL;
    const result = await workflow({
      projectSlug: deps.projectSlug,
      outputId: parsed.data.outputId,
      feedbackType: parsed.data.feedbackType,
      instruction: parsed.data.instruction ?? null,
      model,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = coerceErrorMessage(error);
    return errorResponse(message, statusForError(message));
  }
}
