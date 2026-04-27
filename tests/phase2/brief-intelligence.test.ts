import { describe, expect, it, vi } from "vitest";
import { generateBriefIntelligence } from "@/lib/agents/brief-intelligence";

describe("brief intelligence agent", () => {
  it("sends messy raw brief context to OpenAI and validates structured JSON", async () => {
    const create = vi.fn(async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              audience: "Founders and lean creative teams",
              core_insight: "They need clarity before assets.",
              opportunity: "Turn ambiguous inputs into decision-ready strategy.",
              risks: ["The brief does not name the distribution channel."],
              missing_information: ["Budget", "Launch date"],
              recommended_next_step: "Confirm channel priorities, then generate territories.",
            }),
          },
        },
      ],
    }));

    const result = await generateBriefIntelligence({
      rawBrief: "messy notes: make this feel premium, maybe TikTok, budget unknown",
      project: { name: "Project Atlas", clientName: "Atlas Co" },
      model: "gpt-test",
      openAIClient: { chat: { completions: { create } } },
    });

    expect(result.core_insight).toBe("They need clarity before assets.");
    expect(result.missing_information).toContain("Budget");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-test",
        response_format: expect.objectContaining({ type: "json_schema" }),
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("messy notes"),
          }),
        ]),
      }),
    );
  });

  it("rejects unstructured or incomplete model output before persistence", async () => {
    const create = vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify({ audience: "Everyone" }) } }] }));

    await expect(generateBriefIntelligence({
      rawBrief: "too thin",
      project: { name: "Untitled" },
      model: "gpt-test",
      openAIClient: { chat: { completions: { create } } },
    })).rejects.toThrow(/brief intelligence/i);
  });
});
