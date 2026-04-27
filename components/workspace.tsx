"use client";
import { useState, useCallback } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { RightRail } from "@/components/layout/right-rail";
import { OverviewStage } from "@/components/stages/overview-stage";
import { BriefStage } from "@/components/stages/brief-stage";
import { DirectionStage } from "@/components/stages/direction-stage";
import { ProductionStage } from "@/components/stages/production-stage";
import { ReviewStage } from "@/components/stages/review-stage";
import { ExportStage } from "@/components/stages/export-stage";

export type Stage = "overview" | "brief" | "direction" | "production" | "review" | "export";
type Density = "compact" | "default" | "comfortable";
type Mode = "dark" | "light";

const PROGRESS_MAP: Record<Stage, number> = {
  overview: 62, brief: 20, direction: 45, production: 68, review: 84, export: 96,
};

export function Workspace({ projectSlug = "atlas" }: { projectSlug?: string }) {
  const [stage, setStage] = useState<Stage>("overview");
  const [feedback, setFeedback] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [density] = useState<Density>("default");
  const [mode] = useState<Mode>("dark");
  const [rail] = useState(true);
  const [activeNav, setActiveNav] = useState("projects");
  const [activeProject, setActiveProject] = useState("atlas");

  const ping = useCallback((msg: string) => {
    setToast(msg);
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, []);

  const jump = useCallback((s: Stage) => {
    setStage(s);
    if (typeof window !== "undefined") window.scrollTo?.({ top: 0 });
  }, []);

  // For overview, show a fixed "in progress" snapshot
  const overviewStatuses: Partial<Record<Stage, "done" | "active" | "pending">> = {
    brief: "done", direction: "active", production: "active", review: "pending", export: "pending",
  };

  const onSendFeedback = () => {
    if (!feedback.length) { ping("Pick a direction first"); return; }
    ping(`Applied · ${feedback.join(" · ")}`);
  };

  const progress = PROGRESS_MAP[stage] ?? 62;

  return (
    <>
      <div className="app" data-density={density} data-mode={mode} data-rail={rail ? "on" : "off"}>
        <Sidebar activeNav={activeNav} onNav={setActiveNav} activeProject={activeProject} onProject={setActiveProject} />

        <main className="center">
          <Topbar onShare={() => ping("Share link copied")} />

          {stage === "overview"   && <OverviewStage progress={progress} statuses={overviewStatuses} jump={jump} feedback={feedback} ping={ping} />}
          {stage === "brief"      && <BriefStage projectSlug={projectSlug} jump={jump} ping={ping} />}
          {stage === "direction"  && <DirectionStage projectSlug={projectSlug} jump={jump} ping={ping} feedback={feedback} />}
          {stage === "production" && <ProductionStage projectSlug={projectSlug} jump={jump} ping={ping} />}
          {stage === "review"     && <ReviewStage projectSlug={projectSlug} jump={jump} ping={ping} />}
          {stage === "export"     && <ExportStage projectSlug={projectSlug} jump={jump} ping={ping} />}
        </main>

        {rail && <RightRail feedback={feedback} setFeedback={setFeedback} onSendFeedback={onSendFeedback} />}
      </div>

      {toast && (
        <div className="toast"><span className="dot" />{toast}</div>
      )}
    </>
  );
}
