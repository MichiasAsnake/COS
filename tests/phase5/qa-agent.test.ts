import { describe, expect, it, vi } from "vitest";
import { generateQAReview } from "@/lib/agents/qa-critic";
import type { BriefIntelligence, CopySystem, Territory } from "@/lib/agents/schemas";

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

describe("QA Critic agent", () => {
  it("reviews a production output with structured scoring and actionable fixes", async () => {
    const create = vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify({
      brand_fit: 86,
      clarity: 91,
      novelty: 72,
      channel_fit: 88,
      issues: [{ severity: "medium", title: "Hook could be sharper", body: "The hook is useful but not yet surprising.", recommended_fix: "Lead with the bag dump pain before the solution." }],
      recommended_fixes: ["Make the opening more specific to commuters."],
      verdict: "revise",
    }) } }] }));

    const review = await generateQAReview({
      project: { name: "Project Atlas", clientName: "Atlas Co" },
      briefIntelligence,
      territory,
      output: { id: "output-1", type: "copy_system", title: "Copy System", content: copySystem, version: 1 },
      model: "gpt-test",
      openAIClient: { chat: { completions: { create } } },
    });

    expect(review.verdict).toBe("revise");
    expect(review.brand_fit).toBe(86);
    expect(review.issues[0]).toEqual(expect.objectContaining({ severity: "medium", recommended_fix: expect.stringContaining("bag dump") }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-test",
      response_format: expect.objectContaining({ type: "json_schema" }),
      messages: expect.arrayContaining([
        expect.objectContaining({ role: "user", content: expect.stringContaining("Quiet Utility") }),
        expect.objectContaining({ role: "user", content: expect.stringContaining("Copy System") }),
      ]),
    }));
  });

  it("rejects malformed QA output before persistence", async () => {
    const create = vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify({ verdict: "approve" }) } }] }));

    await expect(generateQAReview({
      project: { name: "Project Atlas" },
      briefIntelligence,
      territory,
      output: { id: "output-1", type: "copy_system", title: "Copy System", content: copySystem, version: 1 },
      model: "gpt-test",
      openAIClient: { chat: { completions: { create } } },
    })).rejects.toThrow(/QA Critic/i);
  });
});
