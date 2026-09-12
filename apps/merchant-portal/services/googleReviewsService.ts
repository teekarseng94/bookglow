/**
 * Merchant side of the Google Business Profile integration.
 *
 * Everything privileged lives in the `google-business` Edge Function: this
 * module only forwards the merchant's Supabase session and returns the
 * connection summary. No client id, client secret or Google token is ever
 * handled here.
 */
import { createBrowserSupabaseClient } from "@bookglow/supabase";

const client = () =>
  createBrowserSupabaseClient(import.meta.env as unknown as Record<string, string | undefined>) as any;

export type GoogleConnectionStatus =
  | "setup_required"
  | "disconnected"
  | "pending_location"
  | "connected"
  | "needs_reauth"
  | "error";

export interface GoogleReviewsConnection {
  configured: boolean;
  missingConfig: string[];
  status: GoogleConnectionStatus;
  accountName?: string | null;
  locationName?: string | null;
  locationTitle?: string | null;
  locationAddress?: string | null;
  mapsUri?: string | null;
  showOnBookingPage: boolean;
  averageRating?: number | null;
  totalReviewCount?: number | null;
  lastSyncedAt?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  lastErrorAt?: string | null;
  connectedEmail?: string | null;
}

export interface GoogleBusinessLocation {
  accountName: string;
  accountLabel: string;
  locationName: string;
  title: string;
  address: string;
  mapsUri: string | null;
}

async function invoke<T>(body: Record<string, unknown>, fallback: string): Promise<T> {
  const { data, error } = await client().functions.invoke("google-business", { body });
  if (error) {
    const payload = data as { error?: string } | null;
    if (payload?.error) throw new Error(payload.error);
    try {
      const parsed = await (error as { context?: Response }).context?.clone?.().json();
      if (parsed?.error) throw new Error(String(parsed.error));
    } catch (parseError) {
      if (parseError instanceof Error && parseError.message && parseError.message !== "Unexpected end of JSON input") {
        throw parseError;
      }
    }
    throw new Error(error.message || fallback);
  }
  const payload = data as { error?: string } | null;
  if (payload?.error) throw new Error(payload.error);
  return data as T;
}

export async function getGoogleConnection(outletId: string): Promise<GoogleReviewsConnection> {
  const data = await invoke<{ connection: GoogleReviewsConnection }>(
    { action: "status", outletId },
    "The Google Reviews connection could not be loaded.",
  );
  return data.connection;
}

export async function startGoogleAuthorization(outletId: string): Promise<string> {
  const data = await invoke<{ authorizationUrl: string }>(
    { action: "oauth_start", outletId, returnTo: window.location.href },
    "Google authorization could not be started.",
  );
  return data.authorizationUrl;
}

export async function listGoogleLocations(outletId: string): Promise<GoogleBusinessLocation[]> {
  const data = await invoke<{ locations: GoogleBusinessLocation[] }>(
    { action: "locations", outletId },
    "Your Google business locations could not be loaded.",
  );
  return data.locations || [];
}

export async function selectGoogleLocation(
  outletId: string,
  accountName: string,
  locationName: string,
): Promise<{ connection: GoogleReviewsConnection; warning?: string }> {
  return invoke<{ connection: GoogleReviewsConnection; warning?: string }>(
    { action: "select_location", outletId, accountName, locationName },
    "The Google location could not be saved.",
  );
}

export async function refreshGoogleReviews(outletId: string): Promise<GoogleReviewsConnection> {
  const data = await invoke<{ connection: GoogleReviewsConnection }>(
    { action: "refresh", outletId },
    "Google reviews could not be refreshed.",
  );
  return data.connection;
}

export async function setGoogleReviewsVisibility(
  outletId: string,
  enabled: boolean,
): Promise<GoogleReviewsConnection> {
  const data = await invoke<{ connection: GoogleReviewsConnection }>(
    { action: "visibility", outletId, enabled },
    "The booking page setting could not be saved.",
  );
  return data.connection;
}

export async function disconnectGoogleReviews(outletId: string): Promise<GoogleReviewsConnection> {
  const data = await invoke<{ connection: GoogleReviewsConnection }>(
    { action: "disconnect", outletId },
    "Google Business Profile could not be disconnected.",
  );
  return data.connection;
}
