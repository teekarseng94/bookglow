/** Convert a display name like "Bali Wellness" to a URL segment like "baliWellness". */
export function shopNameToBookingSlug(name: string): string {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const rest = words.slice(1).map((w) => {
    const letters = w.replace(/[^a-zA-Z0-9]/g, "");
    return letters
      ? letters[0].toUpperCase() + letters.slice(1).toLowerCase()
      : "";
  });
  return first + rest.join("");
}

/** Matches public.slugify_booking_name — ASCII kebab-case. CJK-only names become "". */
export function slugifyBookingName(value: string): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Letters, numbers, underscores, hyphens; must start with a letter (supports camelCase). */
export const BOOKING_SLUG_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export function isValidBookingSlug(s: string): boolean {
  const t = (s || "").trim();
  return t.length > 0 && BOOKING_SLUG_REGEX.test(t);
}

export function normalizeBookingPathSegment(segment: string): string {
  const trimmed = (segment || "").trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed) return "";
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

/** Last 6 identifier characters — same suffix onboarding SQL appends. */
export function bookingSlugOutletSuffix(outletId: string): string {
  const compact = (outletId || "").replace(/[^a-zA-Z0-9]/g, "");
  const suffix = compact.slice(-6);
  return suffix || "shop";
}

/** Matches merchant uniqueBookingSlug — kebab name or 'business' + '-' + last 6 of outlet id. */
export function uniqueBookingSlug(name: string, outletId: string): string {
  const suffix = bookingSlugOutletSuffix(outletId);
  let base = slugifyBookingName(name);
  if (!base) base = "business";
  if (!/^[a-zA-Z]/.test(base)) base = `b-${base}`;
  const slug = `${base}-${suffix}`;
  return isValidBookingSlug(slug) ? slug : `business-${suffix}`;
}

/**
 * True when /book/:segment belongs to this outlet: stored slug, camelCase shop name,
 * kebab shop name, or the unique kebab-suffix path Settings used to advertise unsaved.
 */
export function matchesPublicBookingSegment(
  segment: string,
  bookingSlug: string | null | undefined,
  name: string | null | undefined,
  outletId?: string | null
): boolean {
  const segmentLower = normalizeBookingPathSegment(segment).toLowerCase();
  if (!segmentLower) return false;
  const stored = (bookingSlug || "").trim();
  if (stored && stored.toLowerCase() === segmentLower) return true;
  const derived = shopNameToBookingSlug(name || "");
  if (derived && derived.toLowerCase() === segmentLower) return true;
  const kebab = slugifyBookingName(name || "");
  if (kebab && kebab.toLowerCase() === segmentLower) return true;
  if (outletId) {
    const unique = uniqueBookingSlug(name || "", outletId);
    if (unique && unique.toLowerCase() === segmentLower) return true;
  }
  return false;
}
