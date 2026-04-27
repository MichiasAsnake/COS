import { z } from "zod";

export const envKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
] as const;

const RequiredServerEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
});

export type ServerEnv = z.infer<typeof RequiredServerEnvSchema>;
export type ServerEnvInput = Record<string, string | undefined>;

export type OptionalServerEnvResult =
  | { success: true; data: ServerEnv }
  | { success: false; missing: string[]; message: string };

export function getOptionalServerEnv(raw: ServerEnvInput = process.env): OptionalServerEnvResult {
  const parsed = RequiredServerEnvSchema.safeParse(raw);

  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  const missing = parsed.error.issues
    .filter((issue) => issue.code === "invalid_type" && issue.input === undefined)
    .map((issue) => String(issue.path[0]))
    .filter((key) => key !== "OPENAI_MODEL")
    .sort((a, b) => envKeys.indexOf(a as (typeof envKeys)[number]) - envKeys.indexOf(b as (typeof envKeys)[number]));

  const invalid = parsed.error.issues
    .map((issue) => String(issue.path[0]))
    .filter((key) => !missing.includes(key));

  const details = [
    missing.length ? `missing ${missing.join(", ")}` : null,
    invalid.length ? `invalid ${Array.from(new Set(invalid)).join(", ")}` : null,
  ].filter(Boolean).join("; ");

  return {
    success: false,
    missing,
    message: `COS server environment is not configured: ${details}`,
  };
}

export function getRequiredServerEnv(raw: ServerEnvInput = process.env): ServerEnv {
  const parsed = getOptionalServerEnv(raw);

  if (parsed.success === false) {
    throw new Error(parsed.message);
  }

  return parsed.data;
}
