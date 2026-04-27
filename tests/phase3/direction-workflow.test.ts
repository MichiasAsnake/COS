import { describe, expect, it, vi } from "vitest";
import type { BriefIntelligence, Territory } from "@/lib/agents/schemas";
import type { DirectionWorkflowRepository } from "@/lib/workflow/direction";
import { runCreativeTerritoriesWorkflow, selectTerritoryWorkflow } from "@/lib/workflow/direction";

const briefIntelligence: BriefIntelligence = {
  audience: "Creative leads",
  core_insight: "Decision clarity is the bottleneck.",
  opportunity: "Turn the brief into an execution map.",
  risks: ["Budget unclear"],
  missing_information: ["Launch date"],
  recommended_next_step: "Generate territories",
};

const territories: Territory[] = [
  {
    name: "Quiet Utility",
    description: "A restrained direction grounded in usefulness.",
    strategic_angle: "Make product utility emotionally desirable.",
    visual_language: "Minimal close-ups, precise hands, warm neutrals.",
    tone: "Plainspoken and premium.",
    manifesto: "The everyday object earns attention by doing its job beautifully.",
    best_channels: ["TikTok", "Meta"],
    potential: "high",
    risk: "low",
    distinctiveness: "high",
  },
  {
    name: "Move With It",
    description: "A kinetic direction for lives in motion.",
    strategic_angle: "Show movement as the reason the product exists.",
    visual_language: "Blur, rhythm, transition cuts, urban texture.",
    tone: "Energetic and confident.",
    manifesto: "The product disappears into momentum.",
    best_channels: ["TikTok", "Reels"],
    potential: "high",
    risk: "medium",
    distinctiveness: "medium",
  },
];

function makeRepo(): DirectionWorkflowRepository & { records: Record<string, unknown[]> } {
  const records: Record<string, unknown[]> = {
    runs: [],
    runUpdates: [],
    outputs: [],
    stages: [],
    activity: [],
    selected: [],
  };

  return {
    records,
    async getProjectBySlug(slug) {
      return { id: "project-1", slug, name: "Project Atlas", client_name: "Atlas Co", selected_territory_id: null };
    },
    async getLatestBriefIntelligence(projectId) {
      return { id: "brief-output-1", project_id: projectId, content: briefIntelligence };
    },
    async createAgentRun(input) {
      records.runs.push(input);
      return { id: "run-1" };
    },
    async updateAgentRun(id, update) {
      records.runUpdates.push({ id, ...update });
    },
    async saveTerritoryOutput(input) {
      records.outputs.push(input);
      return { id: `territory-${records.outputs.length}`, ...input };
    },
    async updateWorkflowStage(input) {
      records.stages.push(input);
    },
    async logActivityEvent(input) {
      records.activity.push(input);
    },
    async getTerritoryOutput(projectId, territoryId) {
      return { id: territoryId, project_id: projectId, title: "Quiet Utility", content: territories[0] };
    },
    async selectTerritory(input) {
      records.selected.push(input);
    },
  };
}

describe("direction workflow", () => {
  it("generates territories from persisted brief intelligence and saves each as an output", async () => {
    const repo = makeRepo();
    const generateCreativeTerritories = vi.fn(async () => territories);

    const result = await runCreativeTerritoriesWorkflow({
      projectSlug: "atlas",
      model: "gpt-test",
      repository: repo,
      generateCreativeTerritories,
    });

    expect(result.outputs).toHaveLength(2);
    expect(generateCreativeTerritories).toHaveBeenCalledWith(expect.objectContaining({
      briefIntelligence,
      project: { name: "Project Atlas", clientName: "Atlas Co" },
      model: "gpt-test",
    }));
    expect(repo.records.runs).toEqual([
      expect.objectContaining({ project_id: "project-1", agent_type: "creative_director", stage: "direction", status: "running" }),
    ]);
    expect(repo.records.outputs).toEqual([
      expect.objectContaining({ project_id: "project-1", agent_run_id: "run-1", stage: "direction", type: "territory", title: "Quiet Utility", content: territories[0], status: "draft" }),
      expect.objectContaining({ title: "Move With It", content: territories[1] }),
    ]);
    expect(repo.records.runUpdates).toEqual([
      expect.objectContaining({ id: "run-1", status: "complete", output: { territories } }),
    ]);
    expect(repo.records.stages).toEqual([
      expect.objectContaining({ stage: "direction", status: "needs_review", summary: "2 territories generated; select one to unlock production." }),
    ]);
    expect(repo.records.activity).toEqual([
      expect.objectContaining({ type: "agent_run.completed", message: expect.stringContaining("Creative Director") }),
    ]);
  });

  it("selects a territory, stores it on the project, and unlocks production", async () => {
    const repo = makeRepo();

    const result = await selectTerritoryWorkflow({
      projectSlug: "atlas",
      territoryId: "territory-1",
      repository: repo,
    });

    expect(result.selectedTerritory.id).toBe("territory-1");
    expect(repo.records.selected).toEqual([
      expect.objectContaining({ project_id: "project-1", territory_id: "territory-1" }),
    ]);
    expect(repo.records.stages).toEqual([
      expect.objectContaining({ stage: "direction", status: "complete", summary: "Selected territory: Quiet Utility" }),
      expect.objectContaining({ stage: "production", status: "in_progress", summary: "Ready to generate production system." }),
    ]);
    expect(repo.records.activity).toEqual([
      expect.objectContaining({ type: "territory.selected", message: expect.stringContaining("Quiet Utility") }),
    ]);
  });
});
