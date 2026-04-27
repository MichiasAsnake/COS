import { BriefIntelligenceSchema, type BriefIntelligence } from "@/lib/agents/schemas";

export interface BriefIntelligenceProjectContext {
  name: string;
  clientName?: string | null;
}

interface ChatCompletionLike {
  chat: {
    completions: {
      create(input: unknown): Promise<{
        choices?: Array<{ message?: { content?: string | null } }>;
      }>;
    };
  };
}

export interface GenerateBriefIntelligenceInput {
  rawBrief: string;
  project: BriefIntelligenceProjectContext;
  model: string;
  openAIClient: ChatCompletionLike;
}

const briefIntelligenceJsonSchema = {
  name: "brief_intelligence",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "audience",
      "core_insight",
      "opportunity",
      "risks",
      "missing_information",
      "recommended_next_step",
    ],
    properties: {
      audience: { type: "string", minLength: 1 },
      core_insight: { type: "string", minLength: 1 },
      opportunity: { type: "string", minLength: 1 },
      risks: { type: "array", items: { type: "string", minLength: 1 } },
      missing_information: { type: "array", items: { type: "string", minLength: 1 } },
      recommended_next_step: { type: "string", minLength: 1 },
    },
  },
};

export function buildBriefIntelligenceUserPrompt(input: Pick<GenerateBriefIntelligenceInput, "rawBrief" | "project">) {
  return [
    `Project: ${input.project.name}`,
    input.project.clientName ? `Client: ${input.project.clientName}` : null,
    "",
    "Raw messy brief:",
    input.rawBrief,
    "",
    "Return only structured brief intelligence. Be specific, decision-oriented, and honest about gaps.",
  ].filter(Boolean).join("\n");
}

export function parseBriefIntelligenceJson(content: string): BriefIntelligence {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Brief intelligence model response was not valid JSON: ${error instanceof Error ? error.message : "unknown parse error"}`);
  }

  const result = BriefIntelligenceSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Brief intelligence model response failed validation: ${result.error.issues.map((issue) => issue.path.join(".") || issue.message).join(", ")}`);
  }

  return result.data;
}

export async function generateBriefIntelligence(input: GenerateBriefIntelligenceInput): Promise<BriefIntelligence> {
  const completion = await input.openAIClient.chat.completions.create({
    model: input.model,
    temperature: 0.25,
    response_format: {
      type: "json_schema",
      json_schema: briefIntelligenceJsonSchema,
    },
    messages: [
      {
        role: "system",
        content: "You are the Brief Intelligence Agent inside COS, a workflow-first creative operating system. Transform messy inputs into concise, structured understanding for a creative team. Do not invent facts; surface missing information instead.",
      },
      {
        role: "user",
        content: buildBriefIntelligenceUserPrompt(input),
      },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Brief intelligence model response was empty.");
  }

  return parseBriefIntelligenceJson(content);
}
