import {
  QAReviewSchema,
  type BriefIntelligence,
  type OutputType,
  type QAReview,
  type Territory,
} from "@/lib/agents/schemas";
import type { Json } from "@/types/database";

interface ChatCompletionLike {
  chat: {
    completions: {
      create(input: unknown): Promise<{
        choices?: Array<{ message?: { content?: string | null } }>;
      }>;
    };
  };
}

export interface QAReviewContext {
  project: {
    name: string;
    clientName?: string | null;
  };
  briefIntelligence: BriefIntelligence;
  territory: Territory;
  output: {
    id: string;
    type: OutputType;
    title: string;
    content: Json;
    version: number;
  };
  model: string;
  openAIClient: ChatCompletionLike;
}

const qaReviewJsonSchema = {
  name: "qa_review",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["brand_fit", "clarity", "novelty", "channel_fit", "issues", "recommended_fixes", "verdict"],
    properties: {
      brand_fit: { type: "integer", minimum: 0, maximum: 100 },
      clarity: { type: "integer", minimum: 0, maximum: 100 },
      novelty: { type: "integer", minimum: 0, maximum: 100 },
      channel_fit: { type: "integer", minimum: 0, maximum: 100 },
      issues: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["severity", "title", "body", "recommended_fix"],
          properties: {
            severity: { type: "string", enum: ["low", "medium", "high"] },
            title: { type: "string", minLength: 1 },
            body: { type: "string", minLength: 1 },
            recommended_fix: { type: "string", minLength: 1 },
          },
        },
      },
      recommended_fixes: { type: "array", items: { type: "string", minLength: 1 } },
      verdict: { type: "string", enum: ["approve", "revise"] },
    },
  },
};

function buildQAContextPrompt(input: Pick<QAReviewContext, "project" | "briefIntelligence" | "territory">) {
  return [
    `Project: ${input.project.name}`,
    input.project.clientName ? `Client: ${input.project.clientName}` : null,
    "",
    "Brief intelligence:",
    `Audience: ${input.briefIntelligence.audience}`,
    `Core insight: ${input.briefIntelligence.core_insight}`,
    `Opportunity: ${input.briefIntelligence.opportunity}`,
    `Risks: ${input.briefIntelligence.risks.join("; ") || "None stated"}`,
    "",
    "Selected territory:",
    `Name: ${input.territory.name}`,
    `Strategic angle: ${input.territory.strategic_angle}`,
    `Visual language: ${input.territory.visual_language}`,
    `Tone: ${input.territory.tone}`,
    `Best channels: ${input.territory.best_channels.join(", ")}`,
  ].filter(Boolean).join("\n");
}

export async function generateQAReview(input: QAReviewContext): Promise<QAReview> {
  const completion = await input.openAIClient.chat.completions.create({
    model: input.model,
    temperature: 0.25,
    response_format: { type: "json_schema", json_schema: qaReviewJsonSchema },
    messages: [
      {
        role: "system",
        content: "You are the QA Critic Agent inside COS. Evaluate creative production outputs with specific, actionable critique. Score each dimension from 0-100. Use approve only when the output is demo-ready; otherwise use revise.",
      },
      {
        role: "user",
        content: buildQAContextPrompt(input),
      },
      {
        role: "user",
        content: `Review this output:\nTitle: ${input.output.title}\nType: ${input.output.type}\nVersion: ${input.output.version}\nContent JSON:\n${JSON.stringify(input.output.content)}`,
      },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error("QA Critic model response was empty.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`QA Critic model response was not valid JSON: ${error instanceof Error ? error.message : "unknown parse error"}`);
  }

  const result = QAReviewSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`QA Critic model response failed validation: ${result.error.issues.map((issue) => issue.path.join(".") || issue.message).join(", ")}`);
  }

  return result.data;
}
