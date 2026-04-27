import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

function getSupabasePublicEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase browser client is not configured: missing public Supabase URL/key");
  }

  return { supabaseUrl, supabaseKey };
}

export const createClient = () => {
  const { supabaseUrl, supabaseKey } = getSupabasePublicEnv();

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
};
