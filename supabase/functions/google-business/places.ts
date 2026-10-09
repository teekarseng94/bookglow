/**
 * Google Places API (New) helpers for the default Google Reviews integration.
 * API key stays server-side; Place IDs may be stored; review content is only
 * cached briefly by the caller.
 */

export const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
export const PLACES_DETAILS_BASE = "https://places.googleapis.com/v1/";

const PLACES_TIMEOUT_MS = 10_000;

export type PlacesSearchHit = {
  placeId: string;
  title: string;
  address: string;
  rating: number | null;
  userRatingCount: number | null;
  mapsUri: string | null;
};

export type PlacesDetails = {
  placeId: string;
  title: string;
  address: string;
  rating: number | null;
  userRatingCount: number | null;
  mapsUri: string | null;
  reviews: PlacesReview[];
};

export type PlacesReview = {
  id: string;
  authorName: string;
  avatarUrl: string | null;
  isAnonymous: boolean;
  rating: number | null;
  comment: string | null;
  createTime: string | null;
  updateTime: string | null;
};

export function placesApiKey(): string {
  return (Deno.env.get("GOOGLE_PLACES_API_KEY") || "").trim();
}

export function placesConfigured(): boolean {
  return Boolean(placesApiKey());
}

function resourcePlaceId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("places/") ? trimmed.slice("places/".length) : trimmed;
}

function placesResourceName(placeId: string): string {
  const id = resourcePlaceId(placeId);
  return id ? `places/${id}` : "";
}

async function placesFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PLACES_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function describePlacesError(response: Response): Promise<{ code: string; message: string; status: number }> {
  let message = `Google Places returned ${response.status}.`;
  try {
    const body = await response.json();
    const detail = body?.error?.message || body?.error?.status;
    if (typeof detail === "string" && detail.trim()) message = detail.trim();
  } catch {
    /* non-JSON */
  }
  if (response.status === 403 || response.status === 401) {
    return {
      code: "forbidden",
      message: "Google Places is not available for this BookGlow project yet. Check the Places API key and billing.",
      status: response.status,
    };
  }
  if (response.status === 429) {
    return {
      code: "rate_limited",
      message: "Google Places is busy right now. Please try again shortly.",
      status: 429,
    };
  }
  return { code: `http_${response.status}`, message, status: response.status >= 400 ? response.status : 502 };
}

function displayText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const text = (value as { text?: unknown }).text;
  return typeof text === "string" ? text.trim() : "";
}

function normalizePlacesReview(raw: Record<string, unknown>, index: number): PlacesReview {
  const attribution = (raw.authorAttribution || {}) as Record<string, unknown>;
  const displayName = typeof attribution.displayName === "string" ? attribution.displayName.trim() : "";
  const photo = typeof attribution.photoUri === "string" ? attribution.photoUri.trim() : "";
  const text = displayText(raw.text) || displayText(raw.originalText);
  const rating = typeof raw.rating === "number" && raw.rating >= 1 && raw.rating <= 5
    ? Math.round(raw.rating)
    : null;
  const publishTime = typeof raw.publishTime === "string" ? raw.publishTime : null;
  const name = typeof raw.name === "string" && raw.name ? raw.name : `places-review-${index}`;
  return {
    id: name,
    authorName: displayName || "A Google user",
    avatarUrl: photo.startsWith("https://") ? photo : null,
    isAnonymous: !displayName,
    rating,
    comment: text || null,
    createTime: publishTime,
    updateTime: publishTime,
  };
}

export async function searchPlacesText(
  query: string,
  options: { pageSize?: number } = {},
): Promise<{ results: PlacesSearchHit[] } | { error: { code: string; message: string; status: number } }> {
  const apiKey = placesApiKey();
  if (!apiKey) {
    return {
      error: {
        code: "setup_required",
        message: "Google Places is not configured yet.",
        status: 503,
      },
    };
  }
  const textQuery = query.trim().slice(0, 200);
  if (textQuery.length < 2) {
    return { error: { code: "invalid_query", message: "Enter a business name or address to search.", status: 400 } };
  }

  const response = await placesFetch(PLACES_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri",
    },
    body: JSON.stringify({
      textQuery,
      pageSize: Math.min(10, Math.max(1, options.pageSize ?? 8)),
    }),
  });

  if (!response.ok) return { error: await describePlacesError(response) };

  const body = await response.json() as { places?: Record<string, unknown>[] };
  const results: PlacesSearchHit[] = [];
  for (const place of body.places || []) {
    const placeId = resourcePlaceId(String(place.id || ""));
    if (!placeId) continue;
    results.push({
      placeId,
      title: displayText(place.displayName) || "Untitled place",
      address: typeof place.formattedAddress === "string" ? place.formattedAddress : "",
      rating: typeof place.rating === "number" ? place.rating : null,
      userRatingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
      mapsUri: typeof place.googleMapsUri === "string" ? place.googleMapsUri : null,
    });
  }
  return { results };
}

export async function fetchPlaceDetails(
  placeId: string,
): Promise<{ details: PlacesDetails } | { error: { code: string; message: string; status: number } }> {
  const apiKey = placesApiKey();
  if (!apiKey) {
    return {
      error: {
        code: "setup_required",
        message: "Google Places is not configured yet.",
        status: 503,
      },
    };
  }
  const resource = placesResourceName(placeId);
  if (!resource || !/^places\/[\w-]+$/.test(resource)) {
    return { error: { code: "invalid_place", message: "Choose a Google business from the search results.", status: 400 } };
  }

  const response = await placesFetch(`${PLACES_DETAILS_BASE}${resource}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "id,displayName,formattedAddress,rating,userRatingCount,reviews,googleMapsUri",
    },
  });
  if (!response.ok) return { error: await describePlacesError(response) };

  const place = await response.json() as Record<string, unknown>;
  const resolvedId = resourcePlaceId(String(place.id || placeId));
  if (!resolvedId) {
    return { error: { code: "invalid_place", message: "Google did not return a valid Place ID.", status: 502 } };
  }
  const rawReviews = Array.isArray(place.reviews) ? place.reviews as Record<string, unknown>[] : [];
  return {
    details: {
      placeId: resolvedId,
      title: displayText(place.displayName) || "Google listing",
      address: typeof place.formattedAddress === "string" ? place.formattedAddress : "",
      rating: typeof place.rating === "number" ? place.rating : null,
      userRatingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
      mapsUri: typeof place.googleMapsUri === "string" ? place.googleMapsUri : null,
      reviews: rawReviews.slice(0, 5).map(normalizePlacesReview),
    },
  };
}
