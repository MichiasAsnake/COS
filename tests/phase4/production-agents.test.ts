import { describe, expect, it, vi } from "vitest";
import {
  generateCopySystem,
  generateVisualDirection,
  generateShotList,
} from "@/lib/agents/production-system";

const context = {
  project: { name: "Project Atlas", clientName: "Atlas Co" },
  briefIntelligence: {
    audience: "Busy commuters",
    core_insight: "People want organization without looking over-prepared.",
    opportunity: "Make utility feel desirable and calm.",
    risks: ["Could feel generic"],
    missing_information: ["Budget"],
    recommended_next_step: "Build production system",
  },
  territory: {
    name: "Quiet Utility",
    description: "A restrained direction grounded in usefulness.",
    strategic_angle: "Make product utility emotionally desirable.",
    visual_language: "Minimal close-ups, precise hands, warm neutrals.",
    tone: "Plainspoken and premium.",
    manifesto: "The everyday object earns attention by doing its job beautifully.",
    best_channels: ["TikTok", "Meta"],
    potential: "high" as const,
    risk: "low" as const,
    distinctiveness: "high" as const,
  },
  model: "gpt-test",
};

describe("production system agents", () => {
  it("generates validated copy, visual, and shot-list outputs with structured responses", async () => {
    const create = vi.fn()
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({
        hooks: ["Your bag should not need a search party."],
        scripts: [{ title: "15s Quiet Utility", duration: "15s", voiceover: "Start with the bag dump.", beats: ["bag dump", "pocket reveal"] }],
        caption_options: ["A place for everything, finally."],
        copy_sets: [{ title: "PDP headlines", lines: ["Utility, quietly upgraded."] }],
      }) } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({
        visual_direction: "Warm product close-ups with restrained human presence.",
        image_prompts: ["Studio close-up of organized pockets in warm morning light"],
        video_prompts: ["TikTok UGC: bag dump resolves into one calm organized pack"],
        do_rules: ["Use tactile macro details"],
        dont_rules: ["Avoid luxury cliché props"],
      }) } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({
        shot_list: [{ shot: "Bag dump cold open", purpose: "Show the pain", props: ["daily carry items"], notes: "Keep it under 2 seconds" }],
        deliverables: ["3 TikTok cuts", "6 product stills"],
        production_risks: ["Avoid looking too staged"],
      }) } }] });

    const openAIClient = { chat: { completions: { create } } };

    const copy = await generateCopySystem({ ...context, openAIClient });
    const visual = await generateVisualDirection({ ...context, openAIClient });
    const shots = await generateShotList({ ...context, openAIClient });

    expect(copy.hooks).toContain("Your bag should not need a search party.");
    expect(visual.image_prompts[0]).toContain("organized pockets");
    expect(shots.deliverables).toContain("3 TikTok cuts");
    expect(create).toHaveBeenCalledTimes(3);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-test",
      response_format: expect.objectContaining({ type: "json_schema" }),
      messages: expect.arrayContaining([
        expect.objectContaining({ role: "user", content: expect.stringContaining("Quiet Utility") }),
      ]),
    }));
  });

  it("rejects malformed production outputs before persistence", async () => {
    const create = vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify({ hooks: ["thin"] }) } }] }));

    await expect(generateVisualDirection({
      ...context,
      openAIClient: { chat: { completions: { create } } },
    })).rejects.toThrow(/visual/i);
  });
});
