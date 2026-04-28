"use client";
import { Icons } from "@/components/icons";
import type { Stage } from "@/components/workspace";
import { derivePipelineBlurb, derivePipelineItems, type PipelineStatus } from "@/lib/workspace/pipeline";
import type { OutputSummary, ProjectSummary, WorkflowStageSummary } from "@/types/projects";

interface PipelineStepperProps {
  currentStage: Stage;
  onJump: (stage: Stage) => void;
  statuses?: Partial<Record<Stage, PipelineStatus>>;
  project?: ProjectSummary;
  stages?: WorkflowStageSummary[];
  outputs?: OutputSummary[];
}

export function PipelineStepper({ currentStage, onJump, statuses, project, stages, outputs }: PipelineStepperProps) {
  const items = derivePipelineItems({ project, stages, outputs, fallbackStatuses: statuses });
  const blurb = derivePipelineBlurb(items);

  return (
    <div className="pipeline-card">
      <div className="pipeline-blurb">
        <h4>{blurb.title}</h4>
        {blurb.body} Tap any enabled stage to navigate the pipeline.
        <div style={{ marginTop: 14 }}>
          <button className="btn sm" onClick={() => onJump(blurb.actionStage)}>
            <Icons.doc width={12} height={12} /> {blurb.actionLabel}
          </button>
        </div>
      </div>
      <div className="pipeline-steps">
        {items.map((s, i) => {
          const status = s.status;
          const state = s.id === currentStage ? "active" : status === "done" ? "done" : "pending";
          return (
            <button key={s.id} className="step" data-state={state} onClick={() => onJump(s.id)}>
              <div className="step-num">{String(i + 1).padStart(2, "0")}</div>
              <div className="step-name">{s.name}</div>
              <div className="step-status" data-s={status}>
                <span className="s-dot" />
                {s.meta}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
