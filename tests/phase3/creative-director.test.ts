import { describe, expect, it, vi } from "vitest";
import { generateCreativeTerritories } from "@/lib/agents/creative-director";

const territory = {
  name: "Quiet Utility",
  description: "A campaign world built around product usefulness and restrained confidence.",
  strategic_angle: "Make utility feel aspirational without status signaling.",
  visual_language: "Warm minimal setups, close product details, deliberate negative space.",
  tone: "Considered, plainspoken, quietly premium.",
  manifesto: "The everyday object earns attention by doing its job beautifully.",
  best_channels: ["TikTok", "Meta", "Retail PDP"],
  potential: "high",
  risk: "low",
  distinctiveness: "high",
} as const;

describe("creative director agent", () => {
  it("turns brief intelligence into 3-4 validated territories", async () => {
    const create = vi.fn(async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              territories: [
                territory,
                { ...territory, name: "Move With It", risk: "medium", distinctiveness: "medium" },
                { ...territory, name: "Pocket, Perfected", potential: "medium" },
              ],
            }),
          },
        },
      ],
    }));

    const result = await generateCreativeTerritories({
      briefIntelligence: {
        audience: "Creative leads",
        core_insight: "They need clarity before assets.",
        opportunity: "Make the brief actionable.",
        risks: ["Budget unclear"],
        missing_information: ["Launch date"],
        recommended_next_step: "Generate territories",
      },
      project: { name: "Project Atlas", clientName: "Atlas Co" },
      model: "gpt-test",
      openAIClient: { chat: { completions: { create } } },
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(territory);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-test",
      response_format: expect.objectContaining({ type: "json_schema" }),
      messages: expect.arrayContaining([
        expect.objectContaining({ role: "user", content: expect.stringContaining("They need clarity before assets") }),
      ]),
    }));
  });

  it("rejects incomplete territory responses before persistence", async () => {
    const create = vi.fn(async () => ({
      choices: [{ message: { content: JSON.stringify({ territories: [{ name: "Thin Idea" }] }) } }],
    }));

    await expect(generateCreativeTerritories({
      briefIntelligence: {
        audience: "Audience",
        core_insight: "Insight",
        opportunity: "Opportunity",
        risks: [],
        missing_information: [],
        recommended_next_step: "Next",
      },
      project: { name: "Project Atlas" },
      model: "gpt-test",
      openAIClient: { chat: { completions: { create } } },
    })).rejects.toThrow(/creative director/i);
  });
});
