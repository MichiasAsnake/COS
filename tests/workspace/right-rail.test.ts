import { describe, expect, it } from "vitest";
import { formatRelativeTime, mapActivityForRail, mapAgentRunsForRail, mapFeedbackForRail } from "@/lib/workspace/right-rail";

describe("right rail mapping", () => {
  it("maps agent runs to honest status rows", () => {
    const agents = mapAgentRunsForRail([
      {
        id: "run-1",
        project_id: "project-1",
        agent_type: "creative_director",
        stage: "direction",
        status: "complete",
        error: null,
        model: "gpt-test",
        created_at: "2026-01-01T00:00:00Z",
        completed_at: "2026-01-01T00:00:01Z",
      },
      {
        id: "run-2",
        project_id: "project-1",
        agent_type: "qa_critic",
        stage: "review",
        status: "failed",
        error: "Output not found",
        model: "gpt-test",
        created_at: "2026-01-01T00:01:00Z",
        completed_at: "2026-01-01T00:01:01Z",
      },
    ]);

    expect(agents).toEqual([
      expect.objectContaining({ name: "Creative Director", task: "Generate territories", status: "done", label: "Done" }),
      expect.objectContaining({ name: "QA Critic", task: "Output not found", status: "failed", label: "Failed" }),
    ]);
  });

  it("formats activity and feedback without demo fallback rows", () => {
    const now = new Date("2026-01-01T00:10:00Z").getTime();

    expect(formatRelativeTime("2026-01-01T00:05:00Z", now)).toBe("5m ago");
    expect(mapActivityForRail([{
      id: "activity-1",
      project_id: "project-1",
      type: "project.created",
      message: "Project created: Launch",
      metadata: null,
      created_at: "2026-01-01T00:05:00Z",
    }], now)).toEqual([
      expect.objectContaining({ initials: "CO", agent: false, text: "Project created: Launch", time: "5m ago" }),
    ]);
    expect(mapFeedbackForRail([{
      id: "feedback-1",
      project_id: "project-1",
      output_id: "output-1",
      feedback_type: "less_generic",
      instruction: "Make it more concrete",
      created_at: "2026-01-01T00:05:00Z",
    }], now)).toEqual([
      expect.objectContaining({ label: "Less Generic", instruction: "Make it more concrete", time: "5m ago" }),
    ]);
  });
});
