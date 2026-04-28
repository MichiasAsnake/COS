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

export type AgentRunSummary = Pick<
  Tables<"agent_runs">,
  | "id"
  | "project_id"
  | "agent_type"
  | "stage"
  | "status"
  | "error"
  | "model"
  | "created_at"
  | "completed_at"
>;

export type ActivityEventSummary = Pick<
  Tables<"activity_events">,
  "id" | "project_id" | "type" | "message" | "metadata" | "created_at"
>;

export type FeedbackEventSummary = Pick<
  Tables<"feedback_events">,
  "id" | "project_id" | "output_id" | "feedback_type" | "instruction" | "created_at"
>;

export type ProjectWorkspaceData = {
  project: ProjectSummary;
  projects: ProjectSummary[];
  stages: WorkflowStageSummary[];
  outputs: OutputSummary[];
  agentRuns: AgentRunSummary[];
  activityEvents: ActivityEventSummary[];
  feedbackEvents: FeedbackEventSummary[];
};

export function jsonRecord(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
