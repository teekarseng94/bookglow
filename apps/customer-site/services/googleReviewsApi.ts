/**
 * Public booking-page reads for Google reviews.
 *
 * The browser only sends the published booking slug plus an opaque cursor. The
 * `google-business` Edge Function resolves the slug to an outlet server-side, so
 * a visitor can never target another outlet or an arbitrary Google location, and
 * no integration settings or credentials are returned here.
 */
import type { BookglowSupabaseClient } from "@bookglow/supabase";
import { createBrowserSupabaseClient } from "@bookglow/supabase";
import type { GoogleReview, GoogleReviewSort } from "./googleReviewFormat";

function client(): BookglowSupabaseClient {
  return createBrowserSupabaseClient(import.meta.env as unknown as Record<string, string | undefined>);
}

export type GoogleReviewsPage =
  | { state: "disabled" }
  | { state: "unavailable"; locationTitle: string | null; mapsUri: string | null }
  | {
      state: "ready";
      stale: boolean;
      locationTitle: string | null;
      mapsUri: string | null;
      /** Google's own aggregate values for the whole collection. */
      averageRating: number | null;
      totalReviewCount: number | null;
      reviews: GoogleReview[];
      nextCursor: string | null;
      supportedSorts: GoogleReviewSort[];
    };

type RawResponse = {
  enabled?: boolean;
  reason?: string;
  source?: string;
  stale?: boolean;
  unavailable?: boolean;
  locationTitle?: string | null;
  mapsUri?: string | null;
  averageRating?: number | null;
  totalReviewCount?: number | null;
  reviews?: GoogleReview[];
  nextCursor?: string | null;
  supportedSorts?: string[];
  error?: string;
};

const KNOWN_SORTS: GoogleReviewSort[] = ["newest", "highest", "lowest"];

export async function fetchGoogleReviews(input: {
  bookingSlug: string;
  orderBy?: GoogleReviewSort;
  cursor?: string | null;
}): Promise<GoogleReviewsPage> {
  const { data, error } = await client().functions.invoke("google-business", {
    body: {
      action: "public_reviews",
      bookingSlug: input.bookingSlug,
      orderBy: input.orderBy || "newest",
      cursor: input.cursor || null,
    },
  });

  if (error) {
    const payload = data as RawResponse | null;
    throw new Error(payload?.error || "Google reviews could not be loaded.");
  }

  const payload = (data || {}) as RawResponse;
  if (payload.error) throw new Error(payload.error);
  if (payload.enabled !== true) return { state: "disabled" };

  if (payload.unavailable === true || payload.source === "unavailable") {
    return {
      state: "unavailable",
      locationTitle: payload.locationTitle ?? null,
      mapsUri: payload.mapsUri ?? null,
    };
  }

  const supportedSorts = (payload.supportedSorts || []).filter((sort): sort is GoogleReviewSort =>
    (KNOWN_SORTS as string[]).includes(sort),
  );

  return {
    state: "ready",
    stale: payload.stale === true,
    locationTitle: payload.locationTitle ?? null,
    mapsUri: payload.mapsUri ?? null,
    averageRating: typeof payload.averageRating === "number" ? payload.averageRating : null,
    totalReviewCount: typeof payload.totalReviewCount === "number" ? payload.totalReviewCount : null,
    reviews: Array.isArray(payload.reviews) ? payload.reviews : [],
    nextCursor: payload.nextCursor || null,
    supportedSorts: supportedSorts.length > 0 ? supportedSorts : KNOWN_SORTS,
  };
}
