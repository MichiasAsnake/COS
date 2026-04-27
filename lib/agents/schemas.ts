import { z } from "zod";

export const UuidSchema = z.string().uuid();
export const IsoDateTimeSchema = z.string().datetime({ offset: true });
export const ProjectSlugSchema = z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const WorkflowStageNameSchema = z.enum([
  "brief",
  "direction",
  "production",
  "review",
  "export",
]);

export const WorkflowStageStatusSchema = z.enum([
  "idle",
  "in_progress",
  "needs_review",
  "complete",
  "failed",
]);

export const AgentTypeSchema = z.enum([
  "brief_intelligence",
  "creative_director",
  "copywriter",
  "art_director",
  "production_planner",
  "qa_critic",
  "export_agent",
  "feedback_engine",
]);

export const AgentRunStatusSchema = z.enum([
  "pending",
  "running",
  "complete",
  "failed",
]);

export const OutputTypeSchema = z.enum([
  "brief_intelligence",
  "territory",
  "copy_system",
  "visual_direction",
  "shot_list",
  "prompt_pack",
  "qa_review",
  "export_doc",
]);

export const OutputStatusSchema = z.enum([
  "draft",
  "selected",
  "approved",
  "archived",
]);

export const BriefIntelligenceSchema = z.object({
  audience: z.string().min(1),
  core_insight: z.string().min(1),
  opportunity: z.string().min(1),
  risks: z.array(z.string().min(1)).default([]),
  missing_information: z.array(z.string().min(1)).default([]),
  recommended_next_step: z.string().min(1),
});

export const ScoreSchema = z.enum(["low", "medium", "high"]);

export const TerritorySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  strategic_angle: z.string().min(1),
  visual_language: z.string().min(1),
  tone: z.string().min(1),
  manifesto: z.string().min(1),
  best_channels: z.array(z.string().min(1)).min(1),
  potential: ScoreSchema,
  risk: ScoreSchema,
  distinctiveness: ScoreSchema,
});

export const CopyScriptSchema = z.object({
  title: z.string().min(1),
  duration: z.string().min(1),
  voiceover: z.string().min(1),
  beats: z.array(z.string().min(1)).default([]),
});

export const CopySystemSchema = z.object({
  hooks: z.array(z.string().min(1)).default([]),
  scripts: z.array(CopyScriptSchema).default([]),
  caption_options: z.array(z.string().min(1)).default([]),
  copy_sets: z.array(z.object({
    title: z.string().min(1),
    lines: z.array(z.string().min(1)).default([]),
  })).default([]),
});

export const VisualDirectionSchema = z.object({
  visual_direction: z.string().min(1),
  image_prompts: z.array(z.string().min(1)).default([]),
  video_prompts: z.array(z.string().min(1)).default([]),
  do_rules: z.array(z.string().min(1)).default([]),
  dont_rules: z.array(z.string().min(1)).default([]),
});

export const ShotListSchema = z.object({
  shot_list: z.array(z.object({
    shot: z.string().min(1),
    purpose: z.string().min(1),
    props: z.array(z.string().min(1)).default([]),
    notes: z.string().default(""),
  })).default([]),
  deliverables: z.array(z.string().min(1)).default([]),
  production_risks: z.array(z.string().min(1)).default([]),
});

export const PromptPackSchema = z.object({
  prompts: z.array(z.object({
    title: z.string().min(1),
    prompt: z.string().min(1),
    intended_use: z.string().min(1),
  })).default([]),
});

export const QAReviewSchema = z.object({
  brand_fit: z.number().int().min(0).max(100),
  clarity: z.number().int().min(0).max(100),
  novelty: z.number().int().min(0).max(100),
  channel_fit: z.number().int().min(0).max(100),
  issues: z.array(z.object({
    severity: z.enum(["low", "medium", "high"]),
    title: z.string().min(1),
    body: z.string().min(1),
    recommended_fix: z.string().min(1),
  })).default([]),
  recommended_fixes: z.array(z.string().min(1)).default([]),
  verdict: z.enum(["approve", "revise"]),
});

export const ExportDocSchema = z.object({
  format: z.literal("markdown"),
  markdown: z.string().min(1),
});

export const OutputContentSchema = z.union([
  BriefIntelligenceSchema,
  TerritorySchema,
  CopySystemSchema,
  VisualDirectionSchema,
  ShotListSchema,
  PromptPackSchema,
  QAReviewSchema,
  ExportDocSchema,
  z.record(z.string(), z.unknown()),
]);

export const OutputRecordSchema = z.object({
  id: UuidSchema,
  project_id: UuidSchema,
  agent_run_id: UuidSchema.nullable(),
  parent_output_id: UuidSchema.nullable().optional(),
  stage: WorkflowStageNameSchema,
  type: OutputTypeSchema,
  title: z.string().min(1),
  content: OutputContentSchema,
  version: z.number().int().min(1),
  status: OutputStatusSchema,
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});

export type WorkflowStageName = z.infer<typeof WorkflowStageNameSchema>;
export type AgentType = z.infer<typeof AgentTypeSchema>;
export type OutputType = z.infer<typeof OutputTypeSchema>;
export type BriefIntelligence = z.infer<typeof BriefIntelligenceSchema>;
export type Territory = z.infer<typeof TerritorySchema>;
export type CopySystem = z.infer<typeof CopySystemSchema>;
export type VisualDirection = z.infer<typeof VisualDirectionSchema>;
export type ShotList = z.infer<typeof ShotListSchema>;
export type QAReview = z.infer<typeof QAReviewSchema>;
export type ExportDoc = z.infer<typeof ExportDocSchema>;
export type OutputRecord = z.infer<typeof OutputRecordSchema>;
