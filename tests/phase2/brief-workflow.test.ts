import { describe, expect, it, vi } from "vitest";
import type { BriefIntelligence } from "@/lib/agents/schemas";
import type { BriefWorkflowRepository } from "@/lib/workflow/brief";
import { runBriefIntelligenceWorkflow } from "@/lib/workflow/brief";

function makeRepo(): BriefWorkflowRepository & { calls: string[]; records: Record<string, unknown[]> } {
  const calls: string[] = [];
  const records: Record<string, unknown[]> = {
    inputs: [],
    runs: [],
    runUpdates: [],
    outputs: [],
    stages: [],
    activity: [],
  };

  return {
    calls,
    records,
    async getProjectBySlug(slug) {
      calls.push("getProjectBySlug");
      return { id: "project-1", slug, name: "Project Atlas", client_name: "Atlas Co" };
    },
    async saveBriefInput(input) {
      calls.push("saveBriefInput");
      records.inputs.push(input);
      return { id: "input-1", ...input };
    },
    async createAgentRun(input) {
      calls.push("createAgentRun");
      records.runs.push(input);
      return { id: "run-1" };
    },
    async updateAgentRun(id, update) {
      calls.push(`updateAgentRun:${id}`);
      records.runUpdates.push(update);
    },
    async saveOutput(input) {
      calls.push("saveOutput");
      records.outputs.push(input);
      return { id: "output-1", ...input };
    },
    async updateWorkflowStage(input) {
      calls.push("updateWorkflowStage");
      records.stages.push(input);
    },
    async logActivityEvent(input) {
      calls.push("logActivityEvent");
      records.activity.push(input);
    },
  };
}

const intelligence: BriefIntelligence = {
  audience: "Creative leads",
  core_insight: "Decision clarity is the bottleneck.",
  opportunity: "Turn the brief into an execution map.",
  risks: ["Budget is unclear"],
  missing_information: ["Launch date"],
  recommended_next_step: "Generate territories",
};

describe("brief intelligence workflow", () => {
  it("persists raw brief, agent run, output, stage completion, and activity", async () => {
    const repo = makeRepo();
    const generate = vi.fn(async () => intelligence);

    const result = await runBriefIntelligenceWorkflow({
      projectSlug: "atlas",
      rawBrief: "We need a launch campaign but the channel plan is messy.",
      model: "gpt-test",
      repository: repo,
      generateBriefIntelligence: generate,
    });

    expect(result.output.content).toEqual(intelligence);
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      rawBrief: "We need a launch campaign but the channel plan is messy.",
      project: { name: "Project Atlas", clientName: "Atlas Co" },
      model: "gpt-test",
    }));
    expect(repo.records.inputs).toEqual([
      expect.objectContaining({ project_id: "project-1", type: "brief", content: expect.stringContaining("launch campaign") }),
    ]);
    expect(repo.records.runs).toEqual([
      expect.objectContaining({ project_id: "project-1", agent_type: "brief_intelligence", stage: "brief", status: "running" }),
    ]);
    expect(repo.records.outputs).toEqual([
      expect.objectContaining({ project_id: "project-1", agent_run_id: "run-1", stage: "brief", type: "brief_intelligence", title: "Brief Intelligence", content: intelligence, status: "draft" }),
    ]);
    expect(repo.records.runUpdates).toEqual([
      expect.objectContaining({ status: "complete", output: intelligence, error: null }),
    ]);
    expect(repo.records.stages).toEqual([
      expect.objectContaining({ project_id: "project-1", stage: "brief", status: "complete", summary: intelligence.core_insight }),
    ]);
    expect(repo.records.activity).toEqual([
      expect.objectContaining({ project_id: "project-1", type: "agent_run.completed", message: expect.stringContaining("Brief Intelligence") }),
    ]);
  });

  it("marks the run and brief stage failed when generation fails", async () => {
    const repo = makeRepo();

    await expect(runBriefIntelligenceWorkflow({
      projectSlug: "atlas",
      rawBrief: "brief text",
      model: "gpt-test",
      repository: repo,
      generateBriefIntelligence: vi.fn(async () => { throw new Error("model unavailable"); }),
    })).rejects.toThrow("model unavailable");

    expect(repo.records.runUpdates).toEqual([
      expect.objectContaining({ status: "failed", error: "model unavailable" }),
    ]);
    expect(repo.records.stages).toEqual([
      expect.objectContaining({ stage: "brief", status: "failed", summary: "model unavailable" }),
    ]);
    expect(repo.records.activity).toEqual([
      expect.objectContaining({ type: "agent_run.failed", message: expect.stringContaining("Brief Intelligence failed") }),
    ]);
  });
});
