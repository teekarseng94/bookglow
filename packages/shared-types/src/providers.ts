/**
 * Data / auth providers after Phase D (Supabase-only client runtime).
 * Firebase Hosting may still serve the apps; Firestore/Auth clients are retired.
 */
export type DataProvider = "firebase" | "supabase";
export type AuthProvider = "firebase" | "supabase";

/** Always Supabase after Phase D cutover. Env flags are ignored at runtime. */
export function resolveDataProvider(
  _env?: Record<string, string | undefined>
): DataProvider {
  return "supabase";
}

/** Always Supabase Auth after Phase D cutover. Env flags are ignored at runtime. */
export function resolveAuthProvider(
  _env?: Record<string, string | undefined>
): AuthProvider {
  return "supabase";
}
