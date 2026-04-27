import { z } from "zod";
import {
  CopySystemSchema,
  ShotListSchema,
  VisualDirectionSchema,
  type BriefIntelligence,
  type CopySystem,
  type OutputType,
  type ShotList,
  type Territory,
  type VisualDirection,
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

export interface ProductionAgentContext {
  project: {
    name: string;
    clientName?: string | null;
  };
  briefIntelligence: BriefIntelligence;
  territory: Territory;
  model: string;
  openAIClient: ChatCompletionLike;
}

export type ProductionOutputContent = CopySystem | VisualDirection | ShotList;

const copySystemJsonSchema = {
  name: "copy_system",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["hooks", "scripts", "caption_options", "copy_sets"],
    properties: {
      hooks: { type: "array", items: { type: "string", minLength: 1 } },
      scripts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "duration", "voiceover", "beats"],
          properties: {
            title: { type: "string", minLength: 1 },
            duration: { type: "string", minLength: 1 },
            voiceover: { type: "string", minLength: 1 },
            beats: { type: "array", items: { type: "string", minLength: 1 } },
          },
        },
      },
      caption_options: { type: "array", items: { type: "string", minLength: 1 } },
      copy_sets: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "lines"],
          properties: {
            title: { type: "string", minLength: 1 },
            lines: { type: "array", items: { type: "string", minLength: 1 } },
          },
        },
      },
    },
  },
};

const visualDirectionJsonSchema = {
  name: "visual_direction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["visual_direction", "image_prompts", "video_prompts", "do_rules", "dont_rules"],
    properties: {
      visual_direction: { type: "string", minLength: 1 },
      image_prompts: { type: "array", items: { type: "string", minLength: 1 } },
      video_prompts: { type: "array", items: { type: "string", minLength: 1 } },
      do_rules: { type: "array", items: { type: "string", minLength: 1 } },
      dont_rules: { type: "array", items: { type: "string", minLength: 1 } },
    },
  },
};

const shotListJsonSchema = {
  name: "shot_list",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["shot_list", "deliverables", "production_risks"],
    properties: {
      shot_list: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["shot", "purpose", "props", "notes"],
          properties: {
            shot: { type: "string", minLength: 1 },
            purpose: { type: "string", minLength: 1 },
            props: { type: "array", items: { type: "string", minLength: 1 } },
            notes: { type: "string" },
          },
        },
      },
      deliverables: { type: "array", items: { type: "string", minLength: 1 } },
      production_risks: { type: "array", items: { type: "string", minLength: 1 } },
    },
  },
};

function buildProductionContextPrompt(input: Pick<ProductionAgentContext, "project" | "briefIntelligence" | "territory">) {
  const { project, briefIntelligence, territory } = input;
  return [
    `Project: ${project.name}`,
    project.clientName ? `Client: ${project.clientName}` : null,
    "",
    "Selected territory:",
    `Name: ${territory.name}`,
    `Description: ${territory.description}`,
    `Strategic angle: ${territory.strategic_angle}`,
    `Visual language: ${territory.visual_language}`,
    `Tone: ${territory.tone}`,
    `Manifesto: ${territory.manifesto}`,
    `Best channels: ${territory.best_channels.join(", ")}`,
    "",
    "Brief intelligence:",
    `Audience: ${briefIntelligence.audience}`,
    `Core insight: ${briefIntelligence.core_insight}`,
    `Opportunity: ${briefIntelligence.opportunity}`,
    `Risks: ${briefIntelligence.risks.join("; ") || "None stated"}`,
    `Missing information: ${briefIntelligence.missing_information.join("; ") || "None stated"}`,
  ].filter(Boolean).join("\n");
}

async function runStructuredAgent<T>(input: {
  context: ProductionAgentContext;
  agentName: string;
  system: string;
  userTask: string;
  jsonSchema: unknown;
  schema: z.ZodType<T>;
}) {
  const completion = await input.context.openAIClient.chat.completions.create({
    model: input.context.model,
    temperature: 0.48,
    response_format: { type: "json_schema", json_schema: input.jsonSchema },
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: `${buildProductionContextPrompt(input.context)}\n\nTask:\n${input.userTask}` },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${input.agentName} model response was empty.`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`${input.agentName} model response was not valid JSON: ${error instanceof Error ? error.message : "unknown parse error"}`);
  }

  const result = input.schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`${input.agentName} model response failed validation: ${result.error.issues.map((issue) => issue.path.join(".") || issue.message).join(", ")}`);
  }

  return result.data;
}

export function generateCopySystem(input: ProductionAgentContext): Promise<CopySystem> {
  return runStructuredAgent({
    context: input,
    agentName: "Copywriter",
    system: "You are the Copywriter Agent inside COS. Turn the selected strategic territory into hooks, scripts, captions, and reusable copy sets. Make copy specific, channel-native, and production-ready.",
    userTask: "Generate hooks, scripts, caption options, and copy sets for the selected territory. Include short social hooks and at least one executable script scaffold.",
    jsonSchema: copySystemJsonSchema,
    schema: CopySystemSchema,
  });
}

export function generateVisualDirection(input: ProductionAgentContext): Promise<VisualDirection> {
  return runStructuredAgent({
    context: input,
    agentName: "Visual Direction",
    system: "You are the Art Director Agent inside COS. Convert the selected territory into concrete visual direction, image prompts, video prompts, and rules for production.",
    userTask: "Generate visual direction, image prompts, video prompts, do rules, and don't rules. Prompts should be specific enough for image/video generation or a production team.",
    jsonSchema: visualDirectionJsonSchema,
    schema: VisualDirectionSchema,
  });
}

export function generateShotList(input: ProductionAgentContext): Promise<ShotList> {
  return runStructuredAgent({
    context: input,
    agentName: "Production Planner",
    system: "You are the Production Planner Agent inside COS. Convert the selected territory into a practical shot list, deliverables, and production risks.",
    userTask: "Generate a compact but executable shot list, named deliverables, and production risks for the selected territory.",
    jsonSchema: shotListJsonSchema,
    schema: ShotListSchema,
  });
}

function schemaForOutputType(type: OutputType) {
  if (type === "copy_system") return CopySystemSchema;
  if (type === "visual_direction") return VisualDirectionSchema;
  if (type === "shot_list") return ShotListSchema;
  return z.record(z.string(), z.unknown());
}

export async function reviseProductionOutput(input: {
  output: { id?: string; type: OutputType; title: string; content: Json; version: number };
  feedbackType: string;
  instruction?: string | null;
  model: string;
  openAIClient: ChatCompletionLike;
}): Promise<Json> {
  const schema = schemaForOutputType(input.output.type);
  const completion = await input.openAIClient.chat.completions.create({
    model: input.model,
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are the Feedback Engine inside COS. Revise the provided production output while preserving the exact same JSON shape and output type. Return only JSON.",
      },
      {
        role: "user",
        content: JSON.stringify({
          output_type: input.output.type,
          title: input.output.title,
          current_version: input.output.version,
          feedback_type: input.feedbackType,
          instruction: input.instruction ?? null,
          content: input.output.content,
        }),
      },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error("Feedback Engine model response was empty.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Feedback Engine model response was not valid JSON: ${error instanceof Error ? error.message : "unknown parse error"}`);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Feedback Engine model response failed validation: ${result.error.issues.map((issue) => issue.path.join(".") || issue.message).join(", ")}`);
  }

  return result.data as Json;
}
