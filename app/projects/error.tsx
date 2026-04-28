"use client";

export default function ProjectsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="project-index">
      <section className="project-index-empty">
        <div className="root-card">
          <div className="stage-eyebrow">Project index unavailable</div>
          <h1>Projects could not be loaded.</h1>
          <p>Retry the project list after checking the backend connection.</p>
          <button className="btn primary" type="button" onClick={reset}>
            Retry projects
          </button>
        </div>
      </section>
    </main>
  );
}
