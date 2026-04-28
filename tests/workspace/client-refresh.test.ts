import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("workspace client refresh wiring", () => {
  it("refreshes server workspace data after persisted stage mutations", () => {
    const workspace = source("components/workspace.tsx");
    expect(workspace).toContain("const refreshWorkspace = useCallback");
    expect(workspace).toContain("router.refresh()");

    for (const stage of ["BriefStage", "DirectionStage", "ProductionStage", "ReviewStage", "ExportStage"]) {
      expect(workspace).toContain(`<${stage}`);
      expect(workspace).toContain("onWorkspaceMutated={refreshWorkspace}");
    }

    const stageSources = [
      source("components/stages/brief-stage.tsx"),
      source("components/stages/direction-stage.tsx"),
      source("components/stages/production-stage.tsx"),
      source("components/stages/review-stage.tsx"),
      source("components/stages/export-stage.tsx"),
    ];

    for (const stageSource of stageSources) {
      expect(stageSource).toContain("onWorkspaceMutated: () => void");
      expect(stageSource).toContain("onWorkspaceMutated();");
    }
  });

  it("does not present right-rail planning chips as local-only persisted feedback", () => {
    const workspace = source("components/workspace.tsx");
    const rightRail = source("components/layout/right-rail.tsx");

    expect(workspace).not.toContain("Applied locally");
    expect(workspace).toContain("Use Production feedback actions to create persisted versions");
    expect(rightRail).toContain("PLANNING LENS");
    expect(rightRail).toContain("Persisted revisions happen in Production feedback actions");
  });
});
