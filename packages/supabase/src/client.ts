import { createClient, type LockFunc, type SupabaseClient } from "@supabase/supabase-js";
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

export type BrowserAuthStorage = {
  getItem: (key: string) => string | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

export type BrowserSupabaseAuthOptions = {
  storage?: BrowserAuthStorage;
  detectSessionInUrl?: boolean;
  flowType?: "pkce" | "implicit";
  lock?: LockFunc;
};

/**
 * Singleton typed browser client for Vite apps.
 * Pass `import.meta.env` (or a plain env map) from the app entry.
 * The first caller wins: Android must install native auth storage before mount.
 */
export function createBrowserSupabaseClient(
  env: Record<string, string | undefined>,
  options?: { auth?: BrowserSupabaseAuthOptions }
): BookglowSupabaseClient {
  if (browserClient) return browserClient;
  const { url, publishableKey } = readBrowserSupabaseEnv(env);
  browserClient = createClient<Database>(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: options?.auth?.detectSessionInUrl ?? true,
      flowType: options?.auth?.flowType ?? "pkce",
      ...(options?.auth?.storage ? { storage: options.auth.storage } : {}),
      ...(options?.auth?.lock ? { lock: options.auth.lock } : {}),
    },
  });
  return browserClient;
}

/** Reset singleton (tests only). */
export function __resetBrowserSupabaseClientForTests(): void {
  browserClient = null;
}
