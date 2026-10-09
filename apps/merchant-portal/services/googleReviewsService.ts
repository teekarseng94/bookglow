/**
 * Merchant side of the Google Reviews integration.
 *
 * Default provider is Google Places API (New) via Place ID selection.
 * Google Business Profile OAuth remains available as an advanced path.
 * Privileged work stays in the `google-business` Edge Function.
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

export type GoogleConnectionProvider = "google_places" | "google_business_profile";

export interface GoogleReviewsConnection {
  configured: boolean;
  missingConfig: string[];
  status: GoogleConnectionStatus;
  provider?: GoogleConnectionProvider | null;
  defaultProvider?: GoogleConnectionProvider | null;
  placeId?: string | null;
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
  supportsPagination?: boolean;
}

export interface GoogleBusinessLocation {
  accountName: string;
  accountLabel: string;
  locationName: string;
  title: string;
  address: string;
  mapsUri: string | null;
}

export interface GooglePlaceSearchResult {
  placeId: string;
  title: string;
  address: string;
  rating: number | null;
  userRatingCount: number | null;
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

export async function searchGooglePlaces(
  outletId: string,
  query: string,
): Promise<GooglePlaceSearchResult[]> {
  const data = await invoke<{ results: GooglePlaceSearchResult[] }>(
    { action: "places_search", outletId, query },
    "Google business search could not be completed.",
  );
  return data.results || [];
}

export async function connectGooglePlace(
  outletId: string,
  placeId: string,
): Promise<GoogleReviewsConnection> {
  const data = await invoke<{ connection: GoogleReviewsConnection }>(
    { action: "places_connect", outletId, placeId },
    "The Google listing could not be connected.",
  );
  return data.connection;
}

export async function startGoogleAuthorization(outletId: string): Promise<string> {
  const data = await invoke<{ authorizationUrl: string }>(
    { action: "oauth_start", outletId, returnTo: "/integrations/google-reviews" },
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
    "Google Reviews could not be disconnected.",
  );
  return data.connection;
}
