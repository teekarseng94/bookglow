/**
 * Optional Supabase browser client helpers (provider flags).
 * Live booking uses this when VITE_DATA_PROVIDER / VITE_AUTH_PROVIDER is supabase.
 */
import {
  createBrowserSupabaseClient,
  type BookglowSupabaseClient,
} from "@bookglow/supabase";
import {
  resolveAuthProvider,
  resolveDataProvider,
  type AuthProvider,
  type DataProvider,
} from "@bookglow/shared-types";

type ViteEnv = Record<string, string | undefined>;

function viteEnv(): ViteEnv {
  return import.meta.env as unknown as ViteEnv;
}

export function getDataProvider(): DataProvider {
  return resolveDataProvider(viteEnv());
}

export function getAuthProvider(): AuthProvider {
  return resolveAuthProvider(viteEnv());
}

/** Returns null when env is missing or providers are still Firebase. */
export function getSupabaseBrowserClientOrNull(): BookglowSupabaseClient | null {
  const env = viteEnv();
  if (resolveDataProvider(env) !== "supabase" && resolveAuthProvider(env) !== "supabase") {
    return null;
  }
  try {
    return createBrowserSupabaseClient(env);
  } catch {
    return null;
  }
}
