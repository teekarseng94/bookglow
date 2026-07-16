/** Sentinel for optional staff — createPublicBooking omits staffId when this is selected. */
export const ANY_AVAILABLE_STAFF = "__any__";

/** Map API / Firebase failures to calm customer-facing copy. */
export function friendlyBookingError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!raw) return fallback;
  if (
    /firebase|firestore|permission-denied|unauthenticated|internal|functions\/|https?:\/\//i.test(raw) ||
    raw.includes("FirebaseError")
  ) {
    return fallback;
  }
  return raw;
}
