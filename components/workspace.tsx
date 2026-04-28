"use client";
import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { RightRail } from "@/components/layout/right-rail";
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
type NewProjectForm = {
  name: string;
  clientName: string;
  description: string;
  initialBrief: string;
};

const EMPTY_NEW_PROJECT_FORM: NewProjectForm = {
  name: "",
  clientName: "",
  description: "",
  initialBrief: "",
};

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

export function Workspace({ workspace }: { workspace: ProjectWorkspaceData }) {
  const router = useRouter();
  const { project, projects, stages, outputs } = workspace;
  const [stage, setStage] = useState<Stage>("overview");
  const [feedback, setFeedback] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [density] = useState<Density>("default");
  const [mode] = useState<Mode>("dark");
  const [rail] = useState(true);
  const [activeNav, setActiveNav] = useState("projects");
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState<NewProjectForm>(EMPTY_NEW_PROJECT_FORM);
  const [newProjectError, setNewProjectError] = useState<string | null>(null);

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
    setNewProjectError(null);
    setNewProjectOpen(true);
  }, []);

  const updateNewProjectField = useCallback(<TKey extends keyof NewProjectForm>(key: TKey, value: NewProjectForm[TKey]) => {
    setNewProjectForm((current) => ({ ...current, [key]: value }));
  }, []);

  const submitNewProject = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creatingProject) return;
    setNewProjectError(null);
    setCreatingProject(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newProjectForm.name.trim(),
          clientName: newProjectForm.clientName.trim(),
          description: newProjectForm.description.trim(),
          initialBrief: newProjectForm.initialBrief.trim(),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Could not create project");
      const slug = payload?.project?.slug;
      if (!slug) throw new Error("Project was created but no slug was returned");
      ping(`Created · ${payload.project.name ?? slug}`);
      setNewProjectForm(EMPTY_NEW_PROJECT_FORM);
      setNewProjectOpen(false);
      router.push(`/projects/${slug}`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create project";
      setNewProjectError(message);
      ping(message);
    } finally {
      setCreatingProject(false);
    }
  }, [creatingProject, newProjectForm, ping, router]);

  const handleShare = useCallback(async () => {
    const href = typeof window !== "undefined" ? window.location.href : `/projects/${project.slug}`;
    try {
      await navigator.clipboard.writeText(href);
      ping("Share link copied");
    } catch {
      ping(`Share link: ${href}`);
    }
  }, [ping, project.slug]);

  const handleRename = useCallback(async () => {
    const nextName = window.prompt("Rename project", project.name);
    if (!nextName?.trim() || nextName.trim() === project.name) return;

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.slug)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: nextName.trim() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Could not rename project");
      const slug = payload?.project?.slug ?? project.slug;
      ping("Project renamed");
      if (slug !== project.slug) router.push(`/projects/${slug}`);
      router.refresh();
    } catch (error) {
      ping(error instanceof Error ? error.message : "Could not rename project");
    }
  }, [ping, project.name, project.slug, router]);

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
          <Topbar projectName={project.name} onShare={handleShare} onRename={handleRename} />

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

      {newProjectOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="new-project-title">
            <div className="modal-head">
              <div>
                <div className="stage-eyebrow">New Project</div>
                <h2 id="new-project-title">Create a backend project</h2>
              </div>
              <button className="btn-icon" type="button" onClick={() => setNewProjectOpen(false)} disabled={creatingProject} aria-label="Close new project form">
                ×
              </button>
            </div>

            <form className="project-form" onSubmit={submitNewProject}>
              <label>
                <span>Project name</span>
                <input value={newProjectForm.name} onChange={(event) => updateNewProjectField("name", event.target.value)} minLength={3} maxLength={120} required />
              </label>
              <label>
                <span>Client / brand name</span>
                <input value={newProjectForm.clientName} onChange={(event) => updateNewProjectField("clientName", event.target.value)} maxLength={120} required />
              </label>
              <label>
                <span>Description / objective</span>
                <textarea value={newProjectForm.description} onChange={(event) => updateNewProjectField("description", event.target.value)} minLength={10} maxLength={500} required />
              </label>
              <label>
                <span>Initial brief</span>
                <textarea value={newProjectForm.initialBrief} onChange={(event) => updateNewProjectField("initialBrief", event.target.value)} minLength={40} maxLength={10000} required />
              </label>
              {newProjectError && <div className="brief-error">{newProjectError}</div>}
              <div className="modal-actions">
                <button className="btn" type="button" onClick={() => setNewProjectOpen(false)} disabled={creatingProject}>Cancel</button>
                <button className="btn primary" type="submit" disabled={creatingProject}>
                  {creatingProject ? "Creating…" : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast"><span className="dot" />{toast}</div>
      )}
    </>
  );
}
