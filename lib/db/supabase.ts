import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRequiredServerEnv, getRequiredSupabasePublicEnv, type ServerEnvInput } from "@/lib/env";
import type { Database } from "@/types/database";

type SupabaseAdminFactory<TClient = SupabaseClient<Database>> = (
  supabaseUrl: string,
  supabaseKey: string,
  options: {
    auth: {
      autoRefreshToken: false;
      persistSession: false;
    };
  },
) => TClient;

type SupabasePublicFactory<TClient = SupabaseClient<Database>> = SupabaseAdminFactory<TClient>;

let cachedAdminClient: SupabaseClient<Database> | null = null;

export function createSupabaseAdminClient<TClient = SupabaseClient<Database>>(
  rawEnv: ServerEnvInput = process.env,
  factory: SupabaseAdminFactory<TClient> = createSupabaseClient<Database> as SupabaseAdminFactory<TClient>,
): TClient {
  const env = getRequiredServerEnv(rawEnv);

  return factory(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createSupabasePublicClient<TClient = SupabaseClient<Database>>(
  rawEnv: ServerEnvInput = process.env,
  factory: SupabasePublicFactory<TClient> = createSupabaseClient<Database> as SupabasePublicFactory<TClient>,
): TClient {
  const env = getRequiredSupabasePublicEnv(rawEnv);

  return factory(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSupabaseAdminClient() {
  if (!cachedAdminClient) {
    cachedAdminClient = createSupabaseAdminClient() as SupabaseClient<Database>;
  }

  return cachedAdminClient;
}
