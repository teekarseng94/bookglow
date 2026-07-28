/**
 * Booking-site auth helpers for Supabase Auth (when VITE_AUTH_PROVIDER=supabase).
 * Creates/updates frontend_customers via RPC after sign-up / OAuth.
 */
import { createBrowserSupabaseClient } from "@bookglow/supabase";
import { resolveAuthProvider } from "@bookglow/shared-types";
import { upsertFrontendCustomerProfileFromSupabase } from "./supabasePublicBooking";

type SignUpCredentials = {
  email: string;
  password: string;
};

function viteEnv(): Record<string, string | undefined> {
  return import.meta.env as unknown as Record<string, string | undefined>;
}

function client() {
  return createBrowserSupabaseClient(viteEnv());
}

export function isSupabaseAuthEnabled(): boolean {
  return resolveAuthProvider(viteEnv()) === "supabase";
}

function mapAuthError(error: unknown): string {
  const msg =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message || "")
      : error instanceof Error
        ? error.message
        : "";
  const lower = msg.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "This email is already registered. Try signing in.";
  }
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Invalid email or password.";
  }
  if (lower.includes("password")) {
    return "Password should be at least 6 characters.";
  }
  if (lower.includes("provider") || lower.includes("not enabled")) {
    return "That sign-in method is not enabled yet. Use email or ask the merchant to enable it.";
  }
  if (/supabase|jwt|auth\/|permission|https?:\/\//i.test(msg)) {
    return "Sign-in failed. Please try again.";
  }
  return msg || "Sign-in failed. Please try again.";
}

export function getSupabaseAuthErrorMessage(error: unknown): string {
  return mapAuthError(error);
}

async function afterAuth(email: string | null | undefined, redirectUrl: string): Promise<void> {
  await upsertFrontendCustomerProfileFromSupabase({ email: email ?? null });
  window.location.href = redirectUrl;
}

export async function registerForBookingWithSupabase(
  credentials: SignUpCredentials,
  redirectUrl: string
): Promise<void> {
  const email = credentials.email?.trim().toLowerCase() || "";
  const password = credentials.password || "";

  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const sb = client();
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;

  // If email confirmation is required, session may be null — still try profile when session exists.
  if (data.session) {
    await afterAuth(data.user?.email || email, redirectUrl);
    return;
  }

  // Attempt sign-in in case confirmations are disabled but signUp returned no session.
  const signedIn = await sb.auth.signInWithPassword({ email, password });
  if (signedIn.error) {
    throw new Error(
      "Account created. Confirm your email (if required), then sign in again to continue."
    );
  }
  await afterAuth(signedIn.data.user?.email || email, redirectUrl);
}

export async function registerWithGoogleForBookingSupabase(redirectUrl: string): Promise<void> {
  const sb = client();
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectUrl },
  });
  if (error) throw error;
  // Browser redirects; profile upsert happens on return via BookingPage auth watcher.
}

export async function registerWithFacebookForBookingSupabase(redirectUrl: string): Promise<void> {
  const sb = client();
  const { error } = await sb.auth.signInWithOAuth({
    provider: "facebook",
    options: { redirectTo: redirectUrl },
  });
  if (error) throw error;
}
