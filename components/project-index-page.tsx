"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { CreateProjectModal } from "@/components/project-lifecycle-modal";
import type { ProjectSummary } from "@/types/projects";

function projectDate(project: ProjectSummary) {
  return project.updated_at?.slice(0, 10) || project.created_at?.slice(0, 10) || "No date";
}

function projectDescription(project: ProjectSummary) {
  return project.description || (project.client_name ? `${project.client_name} project workspace` : "Persisted COS project workspace");
}

export function ProjectIndexPage({ projects }: { projects: ProjectSummary[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const activeProjects = useMemo(() => projects.filter((project) => project.status === "active"), [projects]);

  return (
    <>
      <main className="project-index">
        <section className="project-index-hero">
          <div>
            <div className="stage-eyebrow">Project Index</div>
            <h1>Choose a real COS workspace.</h1>
            <p>
              Browse persisted projects, create a fresh brief, or reopen a workspace without falling back to seeded demo content.
            </p>
          </div>
          <button className="btn primary" type="button" onClick={() => setOpen(true)} disabled={creating}>
            <Icons.plus width={14} height={14} /> {creating ? "Creating…" : "New Project"}
          </button>
        </section>

        <section className="project-index-meta" aria-label="Project summary">
          <div className="project-stat">
            <span>Active</span>
            <strong>{activeProjects.length}</strong>
          </div>
          <div className="project-stat">
            <span>Listed</span>
            <strong>{projects.length}</strong>
          </div>
          <div className="project-stat">
            <span>Entry mode</span>
            <strong>List</strong>
          </div>
        </section>

        {projects.length ? (
          <section className="project-grid" aria-label="Projects">
            {projects.map((project) => (
              <article className="project-card" key={project.id}>
                <div>
                  <div className="project-card-topline">
                    <span className="status-pill" data-tone={project.status === "active" ? "ok" : "warn"}>{project.status}</span>
                    <span>{projectDate(project)}</span>
                  </div>
                  <h2>{project.name}</h2>
                  <p>{projectDescription(project)}</p>
                  <div className="project-card-meta">
                    <span>/{project.slug}</span>
                    {project.client_name && <span>{project.client_name}</span>}
                  </div>
                </div>
                <button className="btn primary" type="button" onClick={() => router.push(`/projects/${project.slug}`)}>
                  Open workspace <Icons.arrowR width={14} height={14} />
                </button>
              </article>
            ))}
          </section>
        ) : (
          <section className="project-index-empty">
            <div className="root-card">
              <div className="stage-eyebrow">No active projects</div>
              <h1>Start with a real project brief.</h1>
              <p>Create the first project to initialize workflow stages, persist the initial brief, and enter the workspace.</p>
              <button className="btn primary" type="button" onClick={() => setOpen(true)}>
                Create first project
              </button>
            </div>
          </section>
        )}
      </main>

      <CreateProjectModal
        open={open}
        title={projects.length ? "Create project" : "Create the first project"}
        eyebrow="Project Intake"
        onClose={() => setOpen(false)}
        onSubmittingChange={setCreating}
        onCreated={(project) => {
          setOpen(false);
          router.push(`/projects/${project.slug}`);
          router.refresh();
        }}
      />
    </>
  );
}
