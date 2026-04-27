import { describe, expect, it, vi } from "vitest";
import type { BriefIntelligence, CopySystem, QAReview, ShotList, Territory, VisualDirection } from "@/lib/agents/schemas";
import type { ReviewExportRepository } from "@/lib/workflow/review-export";
import { buildMarkdownExport, exportMarkdownWorkflow, getExportWorkspace, getReviewWorkspace, runQAReviewWorkflow } from "@/lib/workflow/review-export";

const briefIntelligence: BriefIntelligence = {
  audience: "Busy commuters",
  core_insight: "Organization creates calm.",
  opportunity: "Make utility feel desirable.",
  risks: ["Can feel generic"],
  missing_information: ["Budget"],
  recommended_next_step: "Review production output",
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

const qaReview: QAReview = {
  brand_fit: 86,
  clarity: 91,
  novelty: 72,
  channel_fit: 88,
  issues: [{ severity: "medium", title: "Hook could be sharper", body: "The hook is useful but not yet surprising.", recommended_fix: "Lead with the bag dump pain before the solution." }],
  recommended_fixes: ["Make the opening more specific to commuters."],
  verdict: "revise",
};

function makeRepo(): ReviewExportRepository & { records: Record<string, unknown[]> } {
  const outputs = [
    { id: "copy-output", project_id: "project-1", stage: "production", type: "copy_system", title: "Copy System", content: copySystem, version: 1, status: "draft" },
    { id: "visual-output", project_id: "project-1", stage: "production", type: "visual_direction", title: "Visual Direction", content: visualDirection, version: 1, status: "draft" },
    { id: "shot-output", project_id: "project-1", stage: "production", type: "shot_list", title: "Shot List", content: shotList, version: 1, status: "draft" },
  ];
  const records: Record<string, unknown[]> = { runs: [], runUpdates: [], outputs: [], outputUpdates: [], stages: [], activity: [] };

  return {
    records,
    async getProjectBySlug(slug) {
      return { id: "project-1", slug, name: "Project Atlas", client_name: "Atlas Co", selected_territory_id: "territory-1" };
    },
    async getLatestBriefIntelligence(projectId) {
      return { id: "brief-output", project_id: projectId, content: briefIntelligence };
    },
    async getSelectedTerritory(projectId, territoryId) {
      return { id: territoryId, project_id: projectId, title: "Quiet Utility", content: territory };
    },
    async getProductionOutputs(projectId) {
      return outputs.filter((output) => output.project_id === projectId) as never;
    },
    async getProductionOutput(projectId, outputId) {
      return outputs.find((output) => output.project_id === projectId && output.id === outputId) as never;
    },
    async getLatestQAReview() {
      const review = records.outputs.find((output) => (output as { type?: string }).type === "qa_review") as never;
      return review ?? null;
    },
    async getLatestExportDoc() {
      const exported = records.outputs.find((output) => (output as { type?: string }).type === "export_doc") as never;
      return exported ?? null;
    },
    async createAgentRun(input) {
      records.runs.push(input);
      return { id: `run-${records.runs.length}` };
    },
    async updateAgentRun(id, update) {
      records.runUpdates.push({ id, ...update });
    },
    async saveOutput(input) {
      const row = { id: `saved-${records.outputs.length + 1}`, version: input.version ?? 1, status: input.status ?? "draft", ...input };
      records.outputs.push(row);
      return row as never;
    },
    async updateOutputStatus(projectId, outputId, status) {
      records.outputUpdates.push({ projectId, outputId, status });
    },
    async updateWorkflowStage(input) {
      records.stages.push(input);
    },
    async logActivityEvent(input) {
      records.activity.push(input);
    },
  };
}

describe("phase-five review and export workflow", () => {
  it("runs the QA critic against a selected production output and persists a review", async () => {
    const repo = makeRepo();
    const generateQAReview = vi.fn(async () => qaReview);

    const result = await runQAReviewWorkflow({ projectSlug: "atlas", outputId: "copy-output", model: "gpt-test", repository: repo, generateQAReview });

    expect(result.qaReview.content).toEqual(qaReview);
    expect(generateQAReview).toHaveBeenCalledWith(expect.objectContaining({
      briefIntelligence,
      territory,
      output: expect.objectContaining({ id: "copy-output", type: "copy_system" }),
      model: "gpt-test",
    }));
    expect(repo.records.runs).toEqual([expect.objectContaining({ agent_type: "qa_critic", stage: "review", status: "running" })]);
    expect(repo.records.outputs).toEqual([expect.objectContaining({ stage: "review", type: "qa_review", title: "QA Review · Copy System", content: qaReview })]);
    expect(repo.records.stages).toEqual([
      expect.objectContaining({ stage: "review", status: "needs_review" }),
      expect.objectContaining({ stage: "export", status: "in_progress" }),
    ]);
    expect(repo.records.activity).toEqual([expect.objectContaining({ type: "review.completed", message: expect.stringContaining("QA review completed") })]);
  });

  it("builds a usable markdown handoff from approved workflow outputs", () => {
    const markdown = buildMarkdownExport({
      project: { id: "project-1", slug: "atlas", name: "Project Atlas", client_name: "Atlas Co", selected_territory_id: "territory-1" },
      briefOutput: { id: "brief-output", project_id: "project-1", content: briefIntelligence },
      territoryOutput: { id: "territory-1", project_id: "project-1", title: "Quiet Utility", content: territory },
      productionOutputs: [
        { id: "copy-output", project_id: "project-1", stage: "production", type: "copy_system", title: "Copy System", content: copySystem, version: 1, status: "approved" },
        { id: "visual-output", project_id: "project-1", stage: "production", type: "visual_direction", title: "Visual Direction", content: visualDirection, version: 1, status: "approved" },
        { id: "shot-output", project_id: "project-1", stage: "production", type: "shot_list", title: "Shot List", content: shotList, version: 1, status: "approved" },
      ],
      qaReview: { id: "qa-output", project_id: "project-1", stage: "review", type: "qa_review", title: "QA Review", content: qaReview, version: 1, status: "draft" },
    });

    expect(markdown).toContain("# Project Atlas");
    expect(markdown).toContain("## Brief Intelligence");
    expect(markdown).toContain("Quiet Utility");
    expect(markdown).toContain("Your bag should not need a search party.");
    expect(markdown).toContain("Studio close-up of organized pockets");
    expect(markdown).toContain("Bag dump cold open");
    expect(markdown).toContain("## QA Notes");
  });

  it("creates an export_doc output and marks export complete", async () => {
    const repo = makeRepo();
    await repo.saveOutput({ project_id: "project-1", stage: "review", type: "qa_review", title: "QA Review", content: qaReview, version: 1, status: "draft" });

    const result = await exportMarkdownWorkflow({ projectSlug: "atlas", model: "gpt-test", repository: repo });

    expect(result.exportDoc.content.markdown).toContain("# Project Atlas");
    expect(repo.records.runs).toEqual([expect.objectContaining({ agent_type: "export_agent", stage: "export", status: "running" })]);
    expect(repo.records.outputs).toContainEqual(expect.objectContaining({ stage: "export", type: "export_doc", title: "Markdown Handoff · Project Atlas" }));
    expect(repo.records.stages).toContainEqual(expect.objectContaining({ stage: "export", status: "complete" }));
    expect(repo.records.activity).toContainEqual(expect.objectContaining({ type: "export.created", message: expect.stringContaining("Markdown export created") }));
  });

  it("loads review and export workspaces", async () => {
    const repo = makeRepo();

    await expect(getReviewWorkspace("atlas", repo)).resolves.toEqual(expect.objectContaining({
      project: expect.objectContaining({ slug: "atlas" }),
      productionOutputs: expect.arrayContaining([expect.objectContaining({ id: "copy-output" })]),
    }));

    await expect(getExportWorkspace("atlas", repo)).resolves.toEqual(expect.objectContaining({
      project: expect.objectContaining({ slug: "atlas" }),
      productionOutputs: expect.arrayContaining([expect.objectContaining({ id: "shot-output" })]),
    }));
  });
});
