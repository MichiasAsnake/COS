import { describe, expect, it } from "vitest";
import {
  AgentRunStatusSchema,
  BriefIntelligenceSchema,
  OutputRecordSchema,
  ProjectSlugSchema,
  TerritorySchema,
  WorkflowStageNameSchema,
} from "@/lib/agents/schemas";

describe("phase-one domain schemas", () => {
  it("accepts a URL-safe project slug for the demo route decision", () => {
    expect(ProjectSlugSchema.parse("atlas-q3-launch")).toBe("atlas-q3-launch");
    expect(() => ProjectSlugSchema.parse("Atlas Q3 Launch")).toThrow();
  });

  it("validates brief intelligence content used by the brief stage", () => {
    const content = BriefIntelligenceSchema.parse({
      audience: "Creative operators",
      core_insight: "Functional honesty beats status signaling.",
      opportunity: "Make product detail the story.",
      risks: ["Timeline is tight"],
      missing_information: ["Paid media budget"],
      recommended_next_step: "Generate territories",
    });

    expect(content.risks).toHaveLength(1);
  });

  it("validates territory content used by direction cards", () => {
    const territory = TerritorySchema.parse({
      name: "Quiet Utility",
      description: "Elevate the everyday.",
      strategic_angle: "Product-led storytelling",
      visual_language: "Soft, tactile, organized",
      tone: "Confident, restrained",
      manifesto: "The everyday gets serious about itself.",
      best_channels: ["TikTok", "Meta"],
      potential: "high",
      risk: "low",
      distinctiveness: "high",
    });

    expect(territory.best_channels).toContain("TikTok");
  });

  it("validates persisted output records with versioning", () => {
    const output = OutputRecordSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      project_id: "22222222-2222-4222-8222-222222222222",
      agent_run_id: null,
      stage: "direction",
      type: "territory",
      title: "Quiet Utility",
      content: { name: "Quiet Utility" },
      version: 1,
      status: "draft",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });

    expect(output.version).toBe(1);
  });

  it("keeps stage and agent-run enum values aligned with Supabase checks", () => {
    expect(WorkflowStageNameSchema.options).toEqual([
      "brief",
      "direction",
      "production",
      "review",
      "export",
    ]);
    expect(AgentRunStatusSchema.options).toEqual([
      "pending",
      "running",
      "complete",
      "failed",
    ]);
  });
});
