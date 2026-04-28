import { z } from "zod";

export const envKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
] as const;

const RawServerEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
});

const normalizePublicSupabaseKeys = <TEnv extends {
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}>(env: TEnv) => {
  const publicKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

  return {
    ...env,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKey,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? publicKey,
  };
};

function requirePublicSupabaseKey(env: {
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}, context: z.RefinementCtx) {
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    context.addIssue({
      code: "custom",
      path: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
      message: "NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required",
    });
  }
}

const RequiredServerEnvSchema = RawServerEnvSchema
  .superRefine(requirePublicSupabaseKey)
  .transform(normalizePublicSupabaseKeys);

const PublicSupabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
})
  .superRefine(requirePublicSupabaseKey)
  .transform(normalizePublicSupabaseKeys);

export type ServerEnv = z.infer<typeof RequiredServerEnvSchema>;
export type PublicSupabaseEnv = z.infer<typeof PublicSupabaseEnvSchema>;
export type ServerEnvInput = Record<string, string | undefined>;

export type OptionalServerEnvResult =
  | { success: true; data: ServerEnv }
  | { success: false; missing: string[]; message: string };

export function getOptionalServerEnv(raw: ServerEnvInput = process.env): OptionalServerEnvResult {
  const parsed = RequiredServerEnvSchema.safeParse(raw);

  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  const missing = Array.from(
    new Set([
      ...parsed.error.issues
        .filter((issue) => issue.code === "invalid_type" && issue.input === undefined)
        .map((issue) => String(issue.path[0])),
      !raw.NEXT_PUBLIC_SUPABASE_ANON_KEY && !raw.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
        : null,
    ].filter((key): key is string => Boolean(key))),
  )
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

export function getRequiredSupabasePublicEnv(raw: ServerEnvInput = process.env): PublicSupabaseEnv {
  const parsed = PublicSupabaseEnvSchema.safeParse(raw);

  if (parsed.success === false) {
    const details = parsed.error.issues
      .map((issue) => String(issue.path[0]))
      .filter(Boolean)
      .join(", ");
    throw new Error(`COS public Supabase environment is not configured: ${details}`);
  }

  return parsed.data;
}
