"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateProjectModal } from "@/components/project-lifecycle-modal";

export function RootProjectEmptyState() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  return (
    <>
      <main className="root-state">
        <div className="root-card">
          <div className="stage-eyebrow">Project Lifecycle</div>
          <h1>No active projects yet.</h1>
          <p>Create the first project to start the Brief → Direction → Production → Review → Export pipeline with persisted workflow state.</p>
          <button className="btn primary" type="button" onClick={() => { setStatus(null); setOpen(true); }}>
            Create first project
          </button>
          {status && <div className="root-note">{status}</div>}
        </div>
      </main>
      <CreateProjectModal
        open={open}
        title="Create the first project"
        eyebrow="First Project"
        onClose={() => setOpen(false)}
        onCreated={(project) => {
          setStatus(`Created ${project.name}. Opening workspace…`);
          router.push(`/projects/${project.slug}`);
          router.refresh();
        }}
      />
    </>
  );
}

export function RootDisconnectedState() {
  return (
    <main className="root-state">
      <div className="root-card">
        <div className="stage-eyebrow">Backend unavailable</div>
        <h1>COS workspace is not connected yet.</h1>
        <p>Project data could not be loaded. Check the server environment configuration, then retry the project list.</p>
        <button className="btn primary" type="button" onClick={() => window.location.reload()}>
          Retry connection
        </button>
      </div>
    </main>
  );
}
