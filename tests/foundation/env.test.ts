import { describe, expect, it } from "vitest";
import { envKeys, getOptionalServerEnv, getRequiredServerEnv } from "@/lib/env";

describe("server environment parsing", () => {
  const validEnv = {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    OPENAI_API_KEY: "openai-key",
    OPENAI_MODEL: "gpt-4.1-mini",
  };

  it("returns typed server env when required keys are present", () => {
    expect(getRequiredServerEnv(validEnv)).toEqual(validEnv);
  });

  it("defaults the OpenAI model for MVP agent calls", () => {
    const withoutModel = { ...validEnv, OPENAI_MODEL: undefined };

    expect(getRequiredServerEnv(withoutModel).OPENAI_MODEL).toBe("gpt-4.1-mini");
  });

  it("reports missing required env keys without leaking values", () => {
    const result = getOptionalServerEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      OPENAI_API_KEY: "secret-value-that-should-not-appear",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.missing).toEqual([
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
      ]);
      expect(result.message).not.toContain("secret-value-that-should-not-appear");
    }
  });

  it("keeps the documented env key list stable", () => {
    expect(envKeys).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENAI_API_KEY",
      "OPENAI_MODEL",
    ]);
  });
});
