import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isTest = import.meta.env.MODE === "test";
const resolvedSupabaseUrl =
  supabaseUrl ?? (isTest ? "https://example.supabase.co" : undefined);
const resolvedSupabaseAnonKey =
  supabaseAnonKey ?? (isTest ? "test-anon-key" : undefined);

if (!resolvedSupabaseUrl || !resolvedSupabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables",
  );
}

export const supabase = createClient(
  resolvedSupabaseUrl,
  resolvedSupabaseAnonKey,
  {
    auth: {
      flowType: "pkce",
    },
  },
);
