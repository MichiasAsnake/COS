"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  EMPTY_CREATE_PROJECT_FORM,
  validateCreateProjectForm,
  validateRenameProjectName,
  type CreateProjectForm,
} from "@/lib/project-lifecycle";

type LifecycleProject = {
  slug: string;
  name: string;
};

interface CreateProjectModalProps {
  open: boolean;
  title?: string;
  eyebrow?: string;
  onClose: () => void;
  onCreated: (project: LifecycleProject) => void;
  onSubmittingChange?: (submitting: boolean) => void;
}

interface RenameProjectModalProps {
  open: boolean;
  projectSlug: string;
  projectName: string;
  onClose: () => void;
  onRenamed: (project: LifecycleProject) => void;
  onSubmittingChange?: (submitting: boolean) => void;
}

async function readError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error ?? fallback);
  return payload;
}

export function CreateProjectModal({
  open,
  title = "Create a project",
  eyebrow = "New Project",
  onClose,
  onCreated,
  onSubmittingChange,
}: CreateProjectModalProps) {
  const [form, setForm] = useState<CreateProjectForm>(EMPTY_CREATE_PROJECT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onSubmittingChange?.(submitting);
  }, [onSubmittingChange, submitting]);

  if (!open) return null;

  const updateField = <TKey extends keyof CreateProjectForm>(key: TKey, value: CreateProjectForm[TKey]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const closeWithoutMutation = () => {
    if (submitting) return;
    setForm(EMPTY_CREATE_PROJECT_FORM);
    setError(null);
    onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const validationError = validateCreateProjectForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          clientName: form.clientName.trim(),
          description: form.description.trim(),
          initialBrief: form.initialBrief.trim(),
        }),
      });
      const payload = await readError(response, "Could not create project. Check the fields and retry.");
      const project = payload?.project as LifecycleProject | undefined;
      if (!project?.slug) throw new Error("Project was created but no route was returned.");
      setForm(EMPTY_CREATE_PROJECT_FORM);
      onClose();
      onCreated(project);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create project. Retry when the backend is available.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="create-project-title">
        <div className="modal-head">
          <div>
            <div className="stage-eyebrow">{eyebrow}</div>
            <h2 id="create-project-title">{title}</h2>
          </div>
          <button className="btn-icon" type="button" onClick={closeWithoutMutation} disabled={submitting} aria-label="Close project creation form">
            ×
          </button>
        </div>

        <form className="project-form" onSubmit={submit} noValidate>
          <label>
            <span>Project name</span>
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} minLength={3} maxLength={120} required autoFocus />
          </label>
          <label>
            <span>Client / brand name</span>
            <input value={form.clientName} onChange={(event) => updateField("clientName", event.target.value)} maxLength={120} required />
          </label>
          <label>
            <span>Objective / description</span>
            <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} minLength={10} maxLength={500} required />
          </label>
          <label>
            <span>Initial brief</span>
            <textarea value={form.initialBrief} onChange={(event) => updateField("initialBrief", event.target.value)} minLength={40} maxLength={10000} required />
          </label>
          {error && <div className="brief-error">{error}</div>}
          <div className="modal-actions">
            <button className="btn" type="button" onClick={closeWithoutMutation} disabled={submitting}>Cancel</button>
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RenameProjectModal({
  open,
  projectSlug,
  projectName,
  onClose,
  onRenamed,
  onSubmittingChange,
}: RenameProjectModalProps) {
  const [name, setName] = useState(projectName);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onSubmittingChange?.(submitting);
  }, [onSubmittingChange, submitting]);

  if (!open) return null;

  const closeWithoutMutation = () => {
    if (submitting) return;
    setName(projectName);
    setError(null);
    onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const validationError = validateRenameProjectName(name, projectName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectSlug)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const payload = await readError(response, "Could not rename project. Retry when the backend is available.");
      const project = payload?.project as LifecycleProject | undefined;
      if (!project?.slug) throw new Error("Project was renamed but no route was returned.");
      onClose();
      onRenamed(project);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not rename project. Retry when the backend is available.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="rename-project-title">
        <div className="modal-head">
          <div>
            <div className="stage-eyebrow">Rename Project</div>
            <h2 id="rename-project-title">Rename project</h2>
          </div>
          <button className="btn-icon" type="button" onClick={closeWithoutMutation} disabled={submitting} aria-label="Close rename form">
            ×
          </button>
        </div>

        <form className="project-form" onSubmit={submit} noValidate>
          <label>
            <span>Project name</span>
            <input value={name} onChange={(event) => { setName(event.target.value); setError(null); }} minLength={3} maxLength={120} required autoFocus />
          </label>
          {error && <div className="brief-error">{error}</div>}
          <div className="modal-actions">
            <button className="btn" type="button" onClick={closeWithoutMutation} disabled={submitting}>Cancel</button>
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save rename"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
