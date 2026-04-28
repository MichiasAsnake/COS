# Factory Implementation Plan — COS Productization

## Goal

Finish COS as a backend-wired Next.js product in coherent, verifiable phases without reverting the existing backend workspace/stage work.

## Phase 1 — Project creation and initial brief persistence

Status: Completed in this worktree.

Acceptance criteria:
- Sidebar “New Project” opens an in-app form instead of `window.prompt`.
- Form collects project name, client/brand name, description/objective, and initial brief text.
- `POST /api/projects` validates all fields, creates a unique slug, persists the project, creates workflow stages, saves the initial brief in `project_inputs`, logs activity, and redirects the UI to `/projects/{slug}`.
- Duplicate project names receive deterministic suffixes instead of failing with a unique-slug error.
- Validation/server errors are visible in the UI.

Validation:
- Add/extend route handler tests for initial brief persistence, required fields, and duplicate slug retries.
- Run targeted Vitest tests for project handlers.

## Phase 2 — Workspace metadata wiring

Status: Completed in this worktree.

Acceptance criteria:
- Project workspace data includes recent `activity_events`, `agent_runs`, and `feedback_events`.
- Right rail renders real agent run status, feedback history, and activity feed.
- Empty states are honest when no activity/agents/feedback exist.
- Pipeline stepper labels/copy/counts are derived from project stages/outputs/selection instead of fixed demo copy.

Validation:
- Add helper tests for right-rail mapping and pipeline metadata derivation.
- Run targeted Vitest tests for new helpers and existing workspace mapping.

## Phase 3 — Honest topbar/sidebar actions

Status: Completed in this worktree.

Acceptance criteria:
- Share action copies the current project URL and confirms success/failure.
- Rename action persists project name and redirects if slug changes.
- Favorite/more actions are hidden or disabled unless backed by schema/working behavior.
- Secondary nav items that do not have routes are visibly disabled with clear “not enabled” messaging.

Validation:
- Add API/helper tests for project rename and slug conflict behavior.
- Run targeted Vitest tests for project handlers.

## Phase 4 — Static/demo and API/schema audit

Status: Completed for runtime product surfaces touched in this worktree; seeded Atlas data and test fixtures remain intentionally persisted/test-only.

Acceptance criteria:
- Runtime Atlas/demo/static right-rail fallbacks are removed or limited to seed/test data.
- Dead buttons either perform a real action, are disabled, or provide clear honest messaging.
- API error shapes remain consistent (`{ error }`) and edge cases are covered for invalid slug, missing project, missing prerequisites, and duplicate creation/rename.
- `SUPABASE_SCHEMA.sql` is runnable SQL, not markdown-wrapped.

Validation:
- Run search audit for remaining runtime `SAMPLE_`, `mock`, `demo`, `hardcoded`, `Atlas`, `TODO`, `FIXME`, and dead `onClick` patterns.

## Phase 5 — Final verification

Status: Completed in this worktree.

Acceptance criteria:
- Nonexistent projects still 404.
- Empty/new projects do not display Atlas/demo content.
- No secrets are printed or committed.
- No GitHub push, Vercel deploy, or production DB migration is performed.

Validation:
- `npm run lint`
- `npm test`
- `npm run build`
