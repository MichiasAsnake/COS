import { describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "@/lib/db/supabase";
import { createOpenAIClient } from "@/lib/ai/client";

describe("backend client factories", () => {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    OPENAI_API_KEY: "openai-key",
    OPENAI_MODEL: "gpt-4.1-mini",
  };

  it("creates a Supabase admin client with server-only auth options", () => {
    const createClient = vi.fn(() => ({ from: vi.fn() }));

    const client = createSupabaseAdminClient(env, createClient);

    expect(client).toBeTruthy();
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role-key",
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: false,
          persistSession: false,
        }),
      }),
    );
  });

  it("creates an OpenAI client using the server API key", () => {
    const OpenAIConstructor = vi.fn(function MockOpenAI(this: unknown) {
      return { ok: true };
    });

    const client = createOpenAIClient(env, OpenAIConstructor);

    expect(client).toEqual({ ok: true });
    expect(OpenAIConstructor).toHaveBeenCalledWith({ apiKey: "openai-key" });
  });
});
