import { z } from "zod";
import { TerritorySchema, type BriefIntelligence, type Territory } from "@/lib/agents/schemas";

export const CreativeTerritoriesSchema = z.object({
  territories: z.array(TerritorySchema).min(3).max(4),
});

interface ChatCompletionLike {
  chat: {
    completions: {
      create(input: unknown): Promise<{
        choices?: Array<{ message?: { content?: string | null } }>;
      }>;
    };
  };
}

export interface GenerateCreativeTerritoriesInput {
  briefIntelligence: BriefIntelligence;
  project: {
    name: string;
    clientName?: string | null;
  };
  model: string;
  openAIClient: ChatCompletionLike;
}

const territoryJsonSchema = {
  name: "creative_territories",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["territories"],
    properties: {
      territories: {
        type: "array",
        minItems: 3,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "name",
            "description",
            "strategic_angle",
            "visual_language",
            "tone",
            "manifesto",
            "best_channels",
            "potential",
            "risk",
            "distinctiveness",
          ],
          properties: {
            name: { type: "string", minLength: 1 },
            description: { type: "string", minLength: 1 },
            strategic_angle: { type: "string", minLength: 1 },
            visual_language: { type: "string", minLength: 1 },
            tone: { type: "string", minLength: 1 },
            manifesto: { type: "string", minLength: 1 },
            best_channels: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
            potential: { type: "string", enum: ["low", "medium", "high"] },
            risk: { type: "string", enum: ["low", "medium", "high"] },
            distinctiveness: { type: "string", enum: ["low", "medium", "high"] },
          },
        },
      },
    },
  },
};

export function buildCreativeDirectorPrompt(input: Pick<GenerateCreativeTerritoriesInput, "briefIntelligence" | "project">) {
  const brief = input.briefIntelligence;
  return [
    `Project: ${input.project.name}`,
    input.project.clientName ? `Client: ${input.project.clientName}` : null,
    "",
    "Brief Intelligence:",
    `Audience: ${brief.audience}`,
    `Core insight: ${brief.core_insight}`,
    `Opportunity: ${brief.opportunity}`,
    `Risks: ${brief.risks.join("; ") || "None stated"}`,
    `Missing information: ${brief.missing_information.join("; ") || "None stated"}`,
    `Recommended next step: ${brief.recommended_next_step}`,
    "",
    "Generate 3-4 meaningfully distinct strategic campaign territories. They should be choices, not ranked variations. Avoid generic adjectives; make the strategic angle, visual language, and manifesto specific enough for production to execute.",
  ].filter(Boolean).join("\n");
}

export function parseCreativeTerritoriesJson(content: string): Territory[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Creative Director model response was not valid JSON: ${error instanceof Error ? error.message : "unknown parse error"}`);
  }

  const result = CreativeTerritoriesSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Creative Director model response failed validation: ${result.error.issues.map((issue) => issue.path.join(".") || issue.message).join(", ")}`);
  }

  return result.data.territories;
}

export async function generateCreativeTerritories(input: GenerateCreativeTerritoriesInput): Promise<Territory[]> {
  const completion = await input.openAIClient.chat.completions.create({
    model: input.model,
    temperature: 0.45,
    response_format: {
      type: "json_schema",
      json_schema: territoryJsonSchema,
    },
    messages: [
      {
        role: "system",
        content: "You are the Creative Director Agent inside COS. Your job is to turn brief intelligence into distinct strategic campaign territories a creative team can choose from. Return only validated structured output. Do not create minor wording variants; each territory must imply a different creative decision.",
      },
      {
        role: "user",
        content: buildCreativeDirectorPrompt(input),
      },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Creative Director model response was empty.");
  }

  return parseCreativeTerritoriesJson(content);
}
