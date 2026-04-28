"use client";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { RightRail } from "@/components/layout/right-rail";
import { CreateProjectModal, RenameProjectModal } from "@/components/project-lifecycle-modal";
import { OverviewStage } from "@/components/stages/overview-stage";
import { BriefStage } from "@/components/stages/brief-stage";
import { DirectionStage } from "@/components/stages/direction-stage";
import { ProductionStage } from "@/components/stages/production-stage";
import { ReviewStage } from "@/components/stages/review-stage";
import { ExportStage } from "@/components/stages/export-stage";
import type { ProjectWorkspaceData, WorkflowStageSummary } from "@/types/projects";

export type Stage = "overview" | "brief" | "direction" | "production" | "review" | "export";
type Density = "compact" | "default" | "comfortable";
type Mode = "dark" | "light";

type StepState = "done" | "active" | "pending";

function workflowStatusToStepState(status: WorkflowStageSummary["status"]): StepState {
  if (status === "complete") return "done";
  if (status === "idle") return "pending";
  return "active";
}

function progressFromStages(stages: WorkflowStageSummary[]) {
  if (!stages.length) return 0;
  const score = stages.reduce((sum, stage) => {
    if (stage.status === "complete") return sum + 1;
    if (stage.status === "in_progress" || stage.status === "needs_review") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((score / stages.length) * 100);
}

function initialWorkflowStage(stages: WorkflowStageSummary[]): Exclude<Stage, "overview"> {
  return stages.find((item) => item.status === "in_progress" || item.status === "needs_review")?.stage
    ?? stages.find((item) => item.status !== "complete")?.stage
    ?? "export";
}

export function Workspace({ workspace }: { workspace: ProjectWorkspaceData }) {
  const router = useRouter();
  const { project, projects, stages, outputs } = workspace;
  const [stage, setStage] = useState<Stage>(() => initialWorkflowStage(stages));
  const [feedback, setFeedback] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [density] = useState<Density>("default");
  const [mode] = useState<Mode>("dark");
  const [rail] = useState(true);
  const [activeNav, setActiveNav] = useState("projects");
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [renameProjectOpen, setRenameProjectOpen] = useState(false);
  const [renamingProject, setRenamingProject] = useState(false);

  const ping = useCallback((msg: string) => {
    setToast(msg);
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, []);

  const jump = useCallback((s: Stage) => {
    setStage(s);
    if (typeof window !== "undefined") window.scrollTo?.({ top: 0 });
  }, []);

  const statuses = useMemo(() => {
    return stages.reduce<Partial<Record<Stage, StepState>>>((acc, item) => {
      acc[item.stage] = workflowStatusToStepState(item.status);
      return acc;
    }, {});
  }, [stages]);

  const progress = useMemo(() => progressFromStages(stages), [stages]);

  const handleProjectSelect = useCallback((slug: string) => {
    if (slug !== project.slug) router.push(`/projects/${slug}`);
  }, [project.slug, router]);

  const handleNewProject = useCallback(() => {
    setNewProjectOpen(true);
  }, []);

  const handleShare = useCallback(async () => {
    const href = typeof window !== "undefined" ? window.location.href : `/projects/${project.slug}`;
    try {
      await navigator.clipboard.writeText(href);
      ping("Share link copied");
    } catch {
      ping(`Share link: ${href}`);
    }
  }, [ping, project.slug]);

  const handleProjectCreated = useCallback((createdProject: { slug: string; name: string }) => {
    ping(`Created · ${createdProject.name}`);
    setNewProjectOpen(false);
    router.push(`/projects/${createdProject.slug}`);
    router.refresh();
  }, [ping, router]);

  const handleRename = useCallback(() => {
    setRenameProjectOpen(true);
  }, []);

  const handleProjectRenamed = useCallback((renamedProject: { slug: string; name: string }) => {
    ping(`Renamed · ${renamedProject.name}`);
    setRenameProjectOpen(false);
    if (renamedProject.slug !== project.slug) router.push(`/projects/${renamedProject.slug}`);
    router.refresh();
  }, [ping, project.slug, router]);

  const onSendFeedback = () => {
    if (!feedback.length) { ping("Pick a direction first"); return; }
    ping(`Applied locally · ${feedback.join(" · ")}`);
  };

  return (
    <>
      <div className="app" data-density={density} data-mode={mode} data-rail={rail ? "on" : "off"}>
        <Sidebar
          activeNav={activeNav}
          onNav={setActiveNav}
          activeProject={project.slug}
          onProject={handleProjectSelect}
          projects={projects}
          onNewProject={handleNewProject}
          creatingProject={creatingProject}
        />

        <main className="center">
          <Topbar projectName={project.name} onShare={handleShare} onRename={handleRename} renamingProject={renamingProject} />

          {stage === "overview"   && <OverviewStage project={project} stages={stages} outputs={outputs} progress={progress} statuses={statuses} jump={jump} feedback={feedback} ping={ping} />}
          {stage === "brief"      && <BriefStage projectSlug={project.slug} jump={jump} ping={ping} />}
          {stage === "direction"  && <DirectionStage projectSlug={project.slug} jump={jump} ping={ping} feedback={feedback} />}
          {stage === "production" && <ProductionStage projectSlug={project.slug} jump={jump} ping={ping} />}
          {stage === "review"     && <ReviewStage projectSlug={project.slug} jump={jump} ping={ping} />}
          {stage === "export"     && <ExportStage projectSlug={project.slug} jump={jump} ping={ping} />}
        </main>

        {rail && (
          <RightRail
            feedback={feedback}
            setFeedback={setFeedback}
            onSendFeedback={onSendFeedback}
            agentRuns={workspace.agentRuns}
            activityEvents={workspace.activityEvents}
            feedbackEvents={workspace.feedbackEvents}
          />
        )}
      </div>

      <CreateProjectModal
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreated={handleProjectCreated}
        onSubmittingChange={setCreatingProject}
      />

      <RenameProjectModal
        key={`${project.slug}:${project.name}:${renameProjectOpen ? "open" : "closed"}`}
        open={renameProjectOpen}
        projectSlug={project.slug}
        projectName={project.name}
        onClose={() => setRenameProjectOpen(false)}
        onRenamed={handleProjectRenamed}
        onSubmittingChange={setRenamingProject}
      />

      {toast && (
        <div className="toast"><span className="dot" />{toast}</div>
      )}
    </>
  );
}
