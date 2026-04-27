import { z } from "zod";
import { NextResponse } from "next/server";
import { getRequiredServerEnv } from "@/lib/env";
import {
  getDirectionWorkspace as defaultGetDirectionWorkspace,
  runCreativeTerritoriesWorkflow as defaultRunCreativeTerritoriesWorkflow,
  selectTerritoryWorkflow as defaultSelectTerritoryWorkflow,
} from "@/lib/workflow/direction";

const SelectTerritoryRequestSchema = z.object({
  territoryId: z.string().trim().min(1, "territoryId is required"),
});

type DirectionWorkspaceLoader = (projectSlug: string) => Promise<unknown>;
type TerritoryGenerator = (input: Parameters<typeof defaultRunCreativeTerritoriesWorkflow>[0]) => Promise<unknown>;
type TerritorySelector = (input: Parameters<typeof defaultSelectTerritoryWorkflow>[0]) => Promise<unknown>;

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
  if (message.includes("not found") || message.includes("Project not found") || message.includes("Territory not found")) return 404;
  if (message.includes("Brief intelligence is required")) return 409;
  return 500;
}

export async function handleGetTerritoriesRequest(deps: {
  projectSlug: string;
  getDirectionWorkspace?: DirectionWorkspaceLoader;
}) {
  try {
    const load = deps.getDirectionWorkspace ?? defaultGetDirectionWorkspace;
    const workspace = await load(deps.projectSlug);
    if (!workspace) return errorResponse(`Project not found: ${deps.projectSlug}`, 404);
    return NextResponse.json(workspace);
  } catch (error) {
    const message = coerceErrorMessage(error);
    return errorResponse(message, statusForError(message));
  }
}

export async function handleGenerateTerritoriesRequest(deps: {
  projectSlug: string;
  model?: string;
  runCreativeTerritoriesWorkflow?: TerritoryGenerator;
}) {
  try {
    const workflow = deps.runCreativeTerritoriesWorkflow ?? defaultRunCreativeTerritoriesWorkflow;
    const model = deps.model ?? getRequiredServerEnv().OPENAI_MODEL;
    const result = await workflow({ projectSlug: deps.projectSlug, model });
    return NextResponse.json(result);
  } catch (error) {
    const message = coerceErrorMessage(error);
    return errorResponse(message, statusForError(message));
  }
}

export async function handleSelectTerritoryRequest(
  request: Request,
  deps: {
    projectSlug: string;
    selectTerritoryWorkflow?: TerritorySelector;
  },
) {
  const parsed = SelectTerritoryRequestSchema.safeParse(await safeJson(request));
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid territory selection payload");
  }

  try {
    const workflow = deps.selectTerritoryWorkflow ?? defaultSelectTerritoryWorkflow;
    const result = await workflow({ projectSlug: deps.projectSlug, territoryId: parsed.data.territoryId });
    return NextResponse.json(result);
  } catch (error) {
    const message = coerceErrorMessage(error);
    return errorResponse(message, statusForError(message));
  }
}
