import { describe, expect, it } from "vitest";
import { derivePipelineBlurb, derivePipelineItems } from "@/lib/workspace/pipeline";

describe("workspace pipeline metadata", () => {
  it("derives honest stage labels from workflow and outputs", () => {
    const items = derivePipelineItems({
      project: {
        id: "project-1",
        slug: "launch",
        name: "Launch",
        description: null,
        client_name: "Client",
        status: "active",
        selected_territory_id: "territory-1",
        created_at: "2026-01-01",
        updated_at: "2026-01-02",
      },
      stages: [
        { id: "stage-1", project_id: "project-1", stage: "brief", status: "complete", summary: null, updated_at: "2026-01-01" },
        { id: "stage-2", project_id: "project-1", stage: "direction", status: "complete", summary: null, updated_at: "2026-01-01" },
        { id: "stage-3", project_id: "project-1", stage: "production", status: "needs_review", summary: null, updated_at: "2026-01-01" },
      ],
      outputs: [
        { id: "brief-1", project_id: "project-1", stage: "brief", type: "brief_intelligence", title: "Brief", content: {}, status: "draft", version: 1, created_at: "2026-01-01", updated_at: "2026-01-01" },
        { id: "territory-1", project_id: "project-1", stage: "direction", type: "territory", title: "Territory", content: {}, status: "selected", version: 1, created_at: "2026-01-01", updated_at: "2026-01-01" },
        { id: "copy-1", project_id: "project-1", stage: "production", type: "copy_system", title: "Copy", content: {}, status: "draft", version: 1, created_at: "2026-01-01", updated_at: "2026-01-01" },
      ],
    });

    expect(items.map((item) => [item.id, item.status, item.meta])).toEqual([
      ["brief", "done", "Parsed"],
      ["direction", "done", "Territory selected"],
      ["production", "active", "1 output"],
      ["review", "pending", "No review"],
      ["export", "pending", "No export"],
    ]);
  });

  it("summarizes the next active pipeline focus", () => {
    const blurb = derivePipelineBlurb([
      { id: "brief", name: "Brief", status: "done", meta: "Parsed" },
      { id: "direction", name: "Direction", status: "active", meta: "2 territories" },
      { id: "production", name: "Production", status: "pending", meta: "No outputs" },
      { id: "review", name: "Review", status: "pending", meta: "No review" },
      { id: "export", name: "Export", status: "pending", meta: "No export" },
    ]);

    expect(blurb).toEqual(expect.objectContaining({
      title: "Direction is the next workspace focus",
      actionLabel: "Open Direction",
      actionStage: "direction",
    }));
  });
});
