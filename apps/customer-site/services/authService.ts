/**
 * Booking-site auth via Supabase Auth + frontend_customers profile.
 * Legacy marketing signup (/signup) is disabled — use booking auth or merchant login.
 */
import {
  getSupabaseAuthErrorMessage,
  registerForBookingWithSupabase,
  registerWithFacebookForBookingSupabase,
  registerWithGoogleForBookingSupabase,
} from "./supabaseAuthService";

export const DASHBOARD_URL = "/login";

export interface SignUpCredentials {
  email: string;
  password: string;
}

const LEGACY_SIGNUP_MSG =
  "This signup flow is no longer available. Create a customer profile from your merchant's booking page (/book/.../auth), or use merchant login for staff access.";

/**
 * Legacy marketing signup — disabled after Firebase removal.
 */
export async function register(_credentials: SignUpCredentials): Promise<void> {
  throw new Error(LEGACY_SIGNUP_MSG);
}

export async function registerWithGoogle(): Promise<void> {
  throw new Error(LEGACY_SIGNUP_MSG);
}

<<<<<<< HEAD
function getErrorMessage(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Try signing in.";
    case "auth/invalid-email":
      return "Invalid email address format.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Email/Password sign-up is not enabled for this app.";
    default:
      return "Sign-up failed. Please try again.";
  }
}

export function getAuthErrorMessage(error: unknown): string {
  const authError = error as AuthError & { code?: string };
  if (authError?.code) return getErrorMessage(authError.code);
  if (error instanceof Error) {
    const msg = error.message || "";
    if (/firebase|firestore|auth\/|permission|INTERNAL|https?:\/\//i.test(msg)) {
      return "Registration failed. Please try again.";
    }
    return msg;
  }
  return "Registration failed. Please try again.";
=======
export async function registerWithFacebook(): Promise<void> {
  throw new Error(LEGACY_SIGNUP_MSG);
}

export function getAuthErrorMessage(error: unknown): string {
  return getSupabaseAuthErrorMessage(error);
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
}

export async function registerForBooking(
  credentials: SignUpCredentials,
  redirectUrl: string
): Promise<void> {
  await registerForBookingWithSupabase(credentials, redirectUrl);
}

export async function registerWithGoogleForBooking(redirectUrl: string): Promise<void> {
  await registerWithGoogleForBookingSupabase(redirectUrl);
}

export async function registerWithFacebookForBooking(redirectUrl: string): Promise<void> {
  await registerWithFacebookForBookingSupabase(redirectUrl);
}
