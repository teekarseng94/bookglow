/**
 * Data / auth provider flags for the Firebase → Supabase migration.
 * Default remains Firebase until a domain is explicitly cut over.
 */
export type DataProvider = "firebase" | "supabase";
export type AuthProvider = "firebase" | "supabase";

export function resolveDataProvider(
  env: Record<string, string | undefined>
): DataProvider {
  const raw = (env.VITE_DATA_PROVIDER || "firebase").trim().toLowerCase();
  return raw === "supabase" ? "supabase" : "firebase";
}

export function resolveAuthProvider(
  env: Record<string, string | undefined>
): AuthProvider {
  const raw = (env.VITE_AUTH_PROVIDER || "firebase").trim().toLowerCase();
  return raw === "supabase" ? "supabase" : "firebase";
}
