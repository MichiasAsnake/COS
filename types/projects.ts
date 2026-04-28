import type { Json, Tables } from "@/types/database";

export type ProjectSummary = Pick<
  Tables<"projects">,
  | "id"
  | "slug"
  | "name"
  | "description"
  | "client_name"
  | "status"
  | "selected_territory_id"
  | "created_at"
  | "updated_at"
>;

export type WorkflowStageSummary = Pick<
  Tables<"workflow_stages">,
  "id" | "project_id" | "stage" | "status" | "summary" | "updated_at"
>;

export type OutputSummary = Pick<
  Tables<"outputs">,
  | "id"
  | "project_id"
  | "stage"
  | "type"
  | "title"
  | "content"
  | "status"
  | "version"
  | "created_at"
  | "updated_at"
>;

export type ProjectWorkspaceData = {
  project: ProjectSummary;
  projects: ProjectSummary[];
  stages: WorkflowStageSummary[];
  outputs: OutputSummary[];
};

export function jsonRecord(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
