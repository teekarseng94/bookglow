import type { GoogleReviewsConnection } from "./googleReviewsService";

/**
 * Last connection the server confirmed for this outlet.
 *
 * The real record lives in google_business_connections and survives logout.
 * This copy only stops a failed status check (a cold login, a blip) from
 * looking like "disconnected" and asking the merchant to connect again.
 * An explicit disconnect, or a successful status of disconnected, clears it.
 */
const storageKey = (outletId: string) => `bookglow.googleReviews.connection.${outletId}`;

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readRememberedGoogleConnection(outletId: string): GoogleReviewsConnection | null {
  const store = storage();
  if (!outletId || !store) return null;
  try {
    const raw = store.getItem(storageKey(outletId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GoogleReviewsConnection;
    if (parsed?.status !== "connected" && parsed?.status !== "error") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function rememberGoogleConnection(outletId: string, connection: GoogleReviewsConnection): void {
  const store = storage();
  if (!outletId || !store) return;
  if (connection.status === "disconnected" || connection.status === "setup_required") {
    forgetGoogleConnection(outletId);
    return;
  }
  try {
    store.setItem(storageKey(outletId), JSON.stringify(connection));
  } catch {
    /* Storage can be full or blocked. The database row is the source of truth. */
  }
}

export function forgetGoogleConnection(outletId: string): void {
  const store = storage();
  if (!outletId || !store) return;
  try {
    store.removeItem(storageKey(outletId));
  } catch {
    /* ignore */
  }
}
