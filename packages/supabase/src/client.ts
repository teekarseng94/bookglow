import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bookglow/database-contracts";

export type BookglowSupabaseClient = SupabaseClient<Database>;

export type BookglowSupabaseEnv = {
  url: string;
  publishableKey: string;
};

/**
 * Resolve Vite public env for the shared browser client.
 * Pass `import.meta.env` from the calling Vite app.
 * Never pass a service-role / secret key here.
 */
export function readBrowserSupabaseEnv(
  env: Record<string, string | undefined>
): BookglowSupabaseEnv {
  const url = (env.VITE_SUPABASE_URL || "").trim();
  const publishableKey = (
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    ""
  ).trim();

  if (!url) {
    throw new Error(
      "Missing VITE_SUPABASE_URL. Copy apps/*/.env.example to .env and set your Supabase project URL."
    );
  }
  if (!publishableKey) {
    throw new Error(
      "Missing VITE_SUPABASE_PUBLISHABLE_KEY (or legacy VITE_SUPABASE_ANON_KEY). Do not use the service-role key in frontend apps."
    );
  }
  if (/service_role|sb_secret_/i.test(publishableKey)) {
    throw new Error(
      "Refusing to create a browser Supabase client with a secret/service-role key."
    );
  }

  return { url, publishableKey };
}

let browserClient: BookglowSupabaseClient | null = null;

/**
 * Singleton typed browser client for Vite apps.
 * Pass `import.meta.env` (or a plain env map) from the app entry.
 */
export function createBrowserSupabaseClient(
  env: Record<string, string | undefined>
): BookglowSupabaseClient {
  if (browserClient) return browserClient;
  const { url, publishableKey } = readBrowserSupabaseEnv(env);
  browserClient = createClient<Database>(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return browserClient;
}

/** Reset singleton (tests only). */
export function __resetBrowserSupabaseClientForTests(): void {
  browserClient = null;
}
