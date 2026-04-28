export type CreateProjectForm = {
  name: string;
  clientName: string;
  description: string;
  initialBrief: string;
};

export const EMPTY_CREATE_PROJECT_FORM: CreateProjectForm = {
  name: "",
  clientName: "",
  description: "",
  initialBrief: "",
};

const MAX_SLUG_LENGTH = 80;

function trimmed(value: string) {
  return value.trim();
}

export function validateCreateProjectForm(form: CreateProjectForm) {
  if (trimmed(form.name).length < 3) return "Project name must be at least 3 characters.";
  if (!trimmed(form.clientName)) return "Client / brand name is required.";
  if (trimmed(form.description).length < 10) return "Describe the project objective in at least 10 characters.";
  if (trimmed(form.initialBrief).length < 40) return "Paste at least 40 characters for the initial brief.";
  return null;
}

export function validateRenameProjectName(nextName: string, currentName: string) {
  const next = trimmed(nextName);
  if (next.length < 3) return "Project name must be at least 3 characters.";
  if (next === trimmed(currentName)) return "Enter a different project name before saving.";
  return null;
}

function slugCandidate(baseSlug: string, index: number) {
  if (index === 0) return baseSlug.slice(0, MAX_SLUG_LENGTH);
  const suffix = String(index + 1);
  const baseLimit = MAX_SLUG_LENGTH - suffix.length - 1;
  return `${baseSlug.slice(0, baseLimit)}-${suffix}`;
}

export function projectSlugCandidates(baseSlug: string, count: number) {
  return Array.from({ length: count }, (_, index) => slugCandidate(baseSlug, index));
}

export function allocateProjectSlug(baseSlug: string, existingSlugs: Iterable<string>) {
  const used = new Set(existingSlugs);
  for (let index = 0; index < 1000; index += 1) {
    const candidate = slugCandidate(baseSlug, index);
    if (!used.has(candidate)) return candidate;
  }
  throw new Error("Could not allocate a unique project slug.");
}
