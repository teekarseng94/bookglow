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

export async function registerWithFacebook(): Promise<void> {
  throw new Error(LEGACY_SIGNUP_MSG);
}

export function getAuthErrorMessage(error: unknown): string {
  return getSupabaseAuthErrorMessage(error);
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
