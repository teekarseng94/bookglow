/**
 * Booking-site auth helpers for Supabase Auth (when VITE_AUTH_PROVIDER=supabase).
 * Creates/updates frontend_customers via RPC after sign-up / OAuth.
 */
import { createBrowserSupabaseClient } from "@bookglow/supabase";
import { resolveAuthProvider } from "@bookglow/shared-types";
import { upsertFrontendCustomerProfileFromSupabase } from "./supabasePublicBooking";
import { CUSTOMER_RETURN_PATH_KEY, validatedCustomerReturnPath } from "@bookglow/auth-contracts";

type SignUpCredentials = {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
};

function viteEnv(): Record<string, string | undefined> {
  return import.meta.env as unknown as Record<string, string | undefined>;
}

export function customerAuthClient() {
  return createBrowserSupabaseClient(viteEnv());
}

const client = customerAuthClient;

export const isCustomerOAuthEnabled = (provider: "google" | "facebook") =>
  viteEnv()[`VITE_AUTH_${provider.toUpperCase()}_ENABLED`] === "true";

function callbackUrl(): string {
  const configured = viteEnv().VITE_CUSTOMER_AUTH_CALLBACK_URL?.trim();
  return configured || `${window.location.origin}/auth/callback/customer`;
}

function rememberReturnPath(path: string) {
  sessionStorage.setItem(CUSTOMER_RETURN_PATH_KEY, validatedCustomerReturnPath(path));
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
    return "Google sign-in is not available yet. Please continue with email.";
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
  rememberReturnPath(new URL(redirectUrl, window.location.origin).pathname);
  const { data, error } = await sb.auth.signUp({ email, password, options: {
    emailRedirectTo: callbackUrl(),
    data: { full_name: credentials.fullName || null, phone: credentials.phone || null },
  } });
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
  if (!isCustomerOAuthEnabled("google")) throw new Error("Unsupported provider: provider is not enabled");
  rememberReturnPath(new URL(redirectUrl, window.location.origin).pathname);
  const sb = client();
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl() },
  });
  if (error) throw error;
  // Browser redirects; profile upsert happens on return via BookingPage auth watcher.
}

export async function registerWithFacebookForBookingSupabase(redirectUrl: string): Promise<void> {
  if (!isCustomerOAuthEnabled("facebook")) throw new Error("Unsupported provider: provider is not enabled");
  rememberReturnPath(new URL(redirectUrl, window.location.origin).pathname);
  const sb = client();
  const { error } = await sb.auth.signInWithOAuth({
    provider: "facebook",
    options: { redirectTo: callbackUrl() },
  });
  if (error) throw error;
}

export async function signInForBookingWithSupabase(credentials: SignUpCredentials, redirectUrl: string) {
  rememberReturnPath(new URL(redirectUrl, window.location.origin).pathname);
  const { error } = await client().auth.signInWithPassword({ email: credentials.email.trim().toLowerCase(), password: credentials.password });
  if (error) throw error;
  await afterAuth(credentials.email, validatedCustomerReturnPath(new URL(redirectUrl, window.location.origin).pathname));
}

export async function resetCustomerPassword(email: string) {
  const { error } = await client().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: callbackUrl() });
  if (error) throw error;
}
