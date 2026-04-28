import type { Stage } from "@/components/workspace";
import type { OutputSummary, ProjectSummary, WorkflowStageSummary } from "@/types/projects";

export type PipelineStatus = "done" | "active" | "pending";

export type PipelineItem = {
  id: Exclude<Stage, "overview">;
  name: string;
  status: PipelineStatus;
  meta: string;
};

const STAGE_NAMES: Record<PipelineItem["id"], string> = {
  brief: "Brief",
  direction: "Direction",
  production: "Production",
  review: "Review",
  export: "Export",
};

export const PIPELINE_STAGE_ORDER: PipelineItem["id"][] = ["brief", "direction", "production", "review", "export"];

function workflowStatusToPipelineStatus(status?: WorkflowStageSummary["status"]): PipelineStatus {
  if (status === "complete") return "done";
  if (status === "in_progress" || status === "needs_review" || status === "failed") return "active";
  return "pending";
}

function countOutputs(outputs: OutputSummary[], predicate: (output: OutputSummary) => boolean) {
  return outputs.filter(predicate).length;
}

export function derivePipelineItems(input: {
  project?: ProjectSummary;
  stages?: WorkflowStageSummary[];
  outputs?: OutputSummary[];
  fallbackStatuses?: Partial<Record<Stage, PipelineStatus>>;
}): PipelineItem[] {
  const stages = input.stages ?? [];
  const outputs = input.outputs ?? [];
  const stageById = new Map(stages.map((stage) => [stage.stage, stage]));
  const fallbackStatuses = input.fallbackStatuses ?? {};

  const briefCount = countOutputs(outputs, (output) => output.type === "brief_intelligence");
  const territoryCount = countOutputs(outputs, (output) => output.type === "territory");
  const productionCount = countOutputs(outputs, (output) => output.stage === "production");
  const reviewCount = countOutputs(outputs, (output) => output.type === "qa_review");
  const exportCount = countOutputs(outputs, (output) => output.type === "export_doc");
  const hasSelectedTerritory = Boolean(input.project?.selected_territory_id);

  return PIPELINE_STAGE_ORDER.map((stage) => {
    const status = stageById.has(stage)
      ? workflowStatusToPipelineStatus(stageById.get(stage)?.status)
      : fallbackStatuses[stage] ?? "pending";

    let meta = "Waiting";
    if (stage === "brief") {
      meta = briefCount > 0 ? "Parsed" : status === "active" ? "Input saved" : "No intelligence";
    }
    if (stage === "direction") {
      meta = hasSelectedTerritory ? "Territory selected" : territoryCount > 0 ? `${territoryCount} territor${territoryCount === 1 ? "y" : "ies"}` : "No territories";
    }
    if (stage === "production") {
      meta = productionCount > 0 ? `${productionCount} output${productionCount === 1 ? "" : "s"}` : "No outputs";
    }
    if (stage === "review") {
      meta = reviewCount > 0 ? `${reviewCount} review${reviewCount === 1 ? "" : "s"}` : "No review";
    }
    if (stage === "export") {
      meta = exportCount > 0 ? `${exportCount} export${exportCount === 1 ? "" : "s"}` : "No export";
    }

    return {
      id: stage,
      name: STAGE_NAMES[stage],
      status,
      meta,
    };
  });
}

export function derivePipelineBlurb(items: PipelineItem[]) {
  const active = items.find((item) => item.status === "active") ?? items.find((item) => item.status === "pending") ?? items.at(-1);
  const completed = items.filter((item) => item.status === "done").length;

  return {
    title: active ? `${active.name} is the next workspace focus` : "Pipeline complete",
    body: `${completed} of ${items.length} stages are complete. Stage labels and counts are loaded from this project's persisted workflow data.`,
    actionLabel: active?.id === "brief" ? "View Brief" : active ? `Open ${active.name}` : "View Export",
    actionStage: active?.id ?? "export",
  };
}
