"use client";
import { Icons } from "@/components/icons";
import type { Stage } from "@/components/workspace";

const STAGES: { id: Stage; name: string }[] = [
  { id: "brief",      name: "Brief" },
  { id: "direction",  name: "Direction" },
  { id: "production", name: "Production" },
  { id: "review",     name: "Review" },
  { id: "export",     name: "Export" },
];

const META_LABELS: Partial<Record<Stage, Record<string, string>>> = {
  brief:      { done: "Parsed",       active: "Parsing…",     pending: "Pending" },
  direction:  { done: "3 Selected",   active: "3 Territories", pending: "Pending" },
  production: { done: "Complete",     active: "In Progress",  pending: "Pending" },
  review:     { done: "Approved",     active: "Reviewing",    pending: "Pending" },
  export:     { done: "Exported",     active: "Bundling…",    pending: "Pending" },
};

interface PipelineStepperProps {
  currentStage: Stage;
  onJump: (stage: Stage) => void;
  statuses: Partial<Record<Stage, "done" | "active" | "pending">>;
}

export function PipelineStepper({ currentStage, onJump, statuses }: PipelineStepperProps) {
  return (
    <div className="pipeline-card">
      <div className="pipeline-blurb">
        <h4>From Brief to Direction</h4>
        AI parsed the brief and identified the core opportunity. Tap any stage to navigate the pipeline.
        <div style={{ marginTop: 14 }}>
          <button className="btn sm" onClick={() => onJump("brief")}>
            <Icons.doc width={12} height={12} /> View Brief Intelligence
          </button>
        </div>
      </div>
      <div className="pipeline-steps">
        {STAGES.map((s, i) => {
          const status = statuses[s.id] ?? "pending";
          const state = s.id === currentStage ? "active" : status === "done" ? "done" : "pending";
          const meta = META_LABELS[s.id]?.[status] ?? "Pending";
          return (
            <button key={s.id} className="step" data-state={state} onClick={() => onJump(s.id)}>
              <div className="step-num">{String(i + 1).padStart(2, "0")}</div>
              <div className="step-name">{s.name}</div>
              <div className="step-status" data-s={status}>
                <span className="s-dot" />
                {meta}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
