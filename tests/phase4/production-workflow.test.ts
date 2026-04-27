import { describe, expect, it, vi } from "vitest";
import type { BriefIntelligence, CopySystem, ShotList, Territory, VisualDirection } from "@/lib/agents/schemas";
import type { ProductionWorkflowRepository } from "@/lib/workflow/production";
import { applyFeedbackWorkflow, runProductionSystemWorkflow } from "@/lib/workflow/production";

const briefIntelligence: BriefIntelligence = {
  audience: "Busy commuters",
  core_insight: "Organization creates calm.",
  opportunity: "Make utility feel desirable.",
  risks: ["Can feel generic"],
  missing_information: ["Budget"],
  recommended_next_step: "Generate production system",
};

const territory: Territory = {
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
};

const copySystem: CopySystem = {
  hooks: ["Your bag should not need a search party."],
  scripts: [{ title: "15s Quiet Utility", duration: "15s", voiceover: "Start with the bag dump.", beats: ["bag dump", "pocket reveal"] }],
  caption_options: ["A place for everything, finally."],
  copy_sets: [{ title: "PDP headlines", lines: ["Utility, quietly upgraded."] }],
};

const visualDirection: VisualDirection = {
  visual_direction: "Warm product close-ups with restrained human presence.",
  image_prompts: ["Studio close-up of organized pockets"],
  video_prompts: ["TikTok UGC bag dump resolves into calm"],
  do_rules: ["Use tactile macro details"],
  dont_rules: ["Avoid luxury cliché props"],
};

const shotList: ShotList = {
  shot_list: [{ shot: "Bag dump cold open", purpose: "Show the pain", props: ["daily carry items"], notes: "Keep it under 2 seconds" }],
  deliverables: ["3 TikTok cuts", "6 product stills"],
  production_risks: ["Avoid looking too staged"],
};

function makeRepo(): ProductionWorkflowRepository & { records: Record<string, unknown[]> } {
  const records: Record<string, unknown[]> = {
    runs: [],
    runUpdates: [],
    outputs: [],
    stages: [],
    activity: [],
    feedback: [],
  };

  return {
    records,
    async getProjectBySlug(slug) {
      return { id: "project-1", slug, name: "Project Atlas", client_name: "Atlas Co", selected_territory_id: "territory-1" };
    },
    async getLatestBriefIntelligence(projectId) {
      return { id: "brief-output-1", project_id: projectId, content: briefIntelligence };
    },
    async getSelectedTerritory(projectId, territoryId) {
      return { id: territoryId, project_id: projectId, title: "Quiet Utility", content: territory };
    },
    async createAgentRun(input) {
      records.runs.push(input);
      return { id: `run-${records.runs.length}` };
    },
    async updateAgentRun(id, update) {
      records.runUpdates.push({ id, ...update });
    },
    async saveOutput(input) {
      const row = { id: `output-${records.outputs.length + 1}`, version: input.version ?? 1, ...input };
      records.outputs.push(row);
      return row;
    },
    async updateWorkflowStage(input) {
      records.stages.push(input);
    },
    async logActivityEvent(input) {
      records.activity.push(input);
    },
    async getProductionOutputs(projectId) {
      return records.outputs.filter((output) => (output as { project_id?: string }).project_id === projectId) as never;
    },
    async getOutput(projectId, outputId) {
      return { id: outputId, project_id: projectId, stage: "production", type: "copy_system", title: "Copy System", content: copySystem, version: 1 };
    },
    async logFeedbackEvent(input) {
      records.feedback.push(input);
    },
  };
}

describe("production workflow", () => {
  it("runs copywriter, art director, and production planner and persists their outputs", async () => {
    const repo = makeRepo();
    const agents = {
      generateCopySystem: vi.fn(async () => copySystem),
      generateVisualDirection: vi.fn(async () => visualDirection),
      generateShotList: vi.fn(async () => shotList),
    };

    const result = await runProductionSystemWorkflow({ projectSlug: "atlas", model: "gpt-test", repository: repo, ...agents });

    expect(result.outputs).toHaveLength(3);
    expect(agents.generateCopySystem).toHaveBeenCalledWith(expect.objectContaining({ briefIntelligence, territory, model: "gpt-test" }));
    expect(agents.generateVisualDirection).toHaveBeenCalledWith(expect.objectContaining({ territory }));
    expect(agents.generateShotList).toHaveBeenCalledWith(expect.objectContaining({ territory }));
    expect(repo.records.runs).toEqual([
      expect.objectContaining({ agent_type: "copywriter", stage: "production", status: "running" }),
      expect.objectContaining({ agent_type: "art_director", stage: "production", status: "running" }),
      expect.objectContaining({ agent_type: "production_planner", stage: "production", status: "running" }),
    ]);
    expect(repo.records.outputs).toEqual([
      expect.objectContaining({ type: "copy_system", title: "Copy System · Quiet Utility", content: copySystem, version: 1 }),
      expect.objectContaining({ type: "visual_direction", title: "Visual Direction · Quiet Utility", content: visualDirection, version: 1 }),
      expect.objectContaining({ type: "shot_list", title: "Shot List · Quiet Utility", content: shotList, version: 1 }),
    ]);
    expect(repo.records.stages).toEqual([
      expect.objectContaining({ stage: "production", status: "needs_review", summary: "Production system generated: copy, visual direction, and shot list." }),
    ]);
    expect(repo.records.activity).toEqual([
      expect.objectContaining({ type: "production.generated", message: expect.stringContaining("Production system generated") }),
    ]);
  });

  it("creates a new output version and feedback_event without overwriting the previous output", async () => {
    const repo = makeRepo();
    const reviseOutput = vi.fn(async () => ({ ...copySystem, hooks: ["Less generic revised hook."] }));

    const result = await applyFeedbackWorkflow({
      projectSlug: "atlas",
      outputId: "output-1",
      feedbackType: "less_generic",
      instruction: "Make it more specific.",
      model: "gpt-test",
      repository: repo,
      reviseOutput,
    });

    expect(result.revisedOutput.version).toBe(2);
    expect(repo.records.outputs).toEqual([
      expect.objectContaining({ parent_output_id: "output-1", type: "copy_system", version: 2, content: { ...copySystem, hooks: ["Less generic revised hook."] } }),
    ]);
    expect(repo.records.feedback).toEqual([
      expect.objectContaining({ output_id: "output-1", feedback_type: "less_generic", before: copySystem, after: { ...copySystem, hooks: ["Less generic revised hook."] } }),
    ]);
    expect(repo.records.activity).toEqual([
      expect.objectContaining({ type: "feedback.applied", message: expect.stringContaining("less_generic") }),
    ]);
    expect(reviseOutput).toHaveBeenCalledWith(expect.objectContaining({ output: expect.objectContaining({ id: "output-1" }), feedbackType: "less_generic" }));
  });
});
