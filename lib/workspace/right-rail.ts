import type { ActivityEventSummary, AgentRunSummary, FeedbackEventSummary } from "@/types/projects";

const AGENT_LABELS: Record<AgentRunSummary["agent_type"], { name: string; task: string }> = {
  brief_intelligence: { name: "Brief Intelligence", task: "Parse brief input" },
  creative_director: { name: "Creative Director", task: "Generate territories" },
  copywriter: { name: "Copywriter", task: "Generate hooks + scripts" },
  art_director: { name: "Art Director", task: "Visual direction + prompts" },
  production_planner: { name: "Production Planner", task: "Shot list + deliverables" },
  qa_critic: { name: "QA Critic", task: "Review outputs" },
  export_agent: { name: "Export Agent", task: "Bundle handoff" },
  feedback_engine: { name: "Feedback Engine", task: "Revise output version" },
};

export type RailAgentItem = {
  id: string;
  name: string;
  task: string;
  status: "done" | "progress" | "pending" | "failed";
  label: string;
};

export type RailActivityItem = {
  id: string;
  initials: string;
  agent: boolean;
  text: string;
  time: string;
};

export type RailFeedbackItem = {
  id: string;
  label: string;
  instruction: string | null;
  time: string;
};

function statusForRun(status: AgentRunSummary["status"]): RailAgentItem["status"] {
  if (status === "complete") return "done";
  if (status === "failed") return "failed";
  if (status === "running") return "progress";
  return "pending";
}

function labelForStatus(status: RailAgentItem["status"]) {
  if (status === "done") return "Done";
  if (status === "failed") return "Failed";
  if (status === "progress") return "In Progress";
  return "Pending";
}

function humanize(value: string) {
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatRelativeTime(value: string, now = Date.now()) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "unknown time";

  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function mapAgentRunsForRail(agentRuns: AgentRunSummary[]): RailAgentItem[] {
  return agentRuns.map((run) => {
    const config = AGENT_LABELS[run.agent_type] ?? { name: humanize(run.agent_type), task: humanize(run.stage) };
    const status = statusForRun(run.status);

    return {
      id: run.id,
      name: config.name,
      task: run.error ? run.error : config.task,
      status,
      label: labelForStatus(status),
    };
  });
}

export function mapActivityForRail(activityEvents: ActivityEventSummary[], now = Date.now()): RailActivityItem[] {
  return activityEvents.map((event) => {
    const isAgent = event.type.includes("agent") || event.type.includes("production") || event.type.includes("review") || event.type.includes("export");
    const initials = isAgent ? "AI" : "CO";

    return {
      id: event.id,
      initials,
      agent: isAgent,
      text: event.message,
      time: formatRelativeTime(event.created_at, now),
    };
  });
}

export function mapFeedbackForRail(feedbackEvents: FeedbackEventSummary[], now = Date.now()): RailFeedbackItem[] {
  return feedbackEvents.map((event) => ({
    id: event.id,
    label: humanize(event.feedback_type),
    instruction: event.instruction,
    time: formatRelativeTime(event.created_at, now),
  }));
}
