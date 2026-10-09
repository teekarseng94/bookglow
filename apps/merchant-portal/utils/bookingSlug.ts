/** Convert a display name like "Harbour Spa" to a URL segment like "harbourSpa". */
export function shopNameToBookingSlug(name: string): string {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const rest = words.slice(1).map((w) => {
    const letters = w.replace(/[^a-zA-Z0-9]/g, '');
    return letters
      ? letters[0].toUpperCase() + letters.slice(1).toLowerCase()
      : '';
  });
  return first + rest.join('');
}

/** Matches public.slugify_booking_name — ASCII kebab-case. CJK-only names become ''. */
export function slugifyBookingName(value: string): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Letters, numbers, underscores, hyphens; must start with a letter (supports camelCase and kebab-case). */
export const BOOKING_SLUG_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export function isValidBookingSlug(s: string): boolean {
  const t = (s || '').trim();
  return t.length > 0 && BOOKING_SLUG_REGEX.test(t);
}

/** Hide the retired demo path from the merchant editor without changing real custom paths. */
export function bookingSlugForEditor(value: string | undefined | null): string {
  const stored = (value || '').trim();
  return stored.toLowerCase() === 'baliwellness' ? '' : stored;
}

/** Last 6 identifier characters — same suffix ensure_merchant_workspace appends. */
export function bookingSlugOutletSuffix(outletId: string): string {
  const compact = (outletId || '').replace(/[^a-zA-Z0-9]/g, '');
  const suffix = compact.slice(-6);
  return suffix || 'shop';
}

/**
 * Stable public path for a new outlet. Always valid, unique per outlet id, and
 * matches onboarding SQL: slugify(name) or 'business' + '-' + last 6 of outlet_id.
 */
export function uniqueBookingSlug(name: string, outletId: string): string {
  const suffix = bookingSlugOutletSuffix(outletId);
  let base = slugifyBookingName(name);
  if (!base) base = 'business';
  if (!/^[a-zA-Z]/.test(base)) base = `b-${base}`;
  const slug = `${base}-${suffix}`;
  return isValidBookingSlug(slug) ? slug : `business-${suffix}`;
}

/**
 * Public path a shop name should produce, or '' when the name has no Latin
 * characters to build a URL from (CJK-only names, or names starting with a
 * digit). Callers prompt for a manual path rather than inventing one.
 */
export function bookingSlugFromShopName(name: string): string {
  const slug = shopNameToBookingSlug(name);
  return isValidBookingSlug(slug) ? slug : '';
}

/**
 * True while `slug` is still exactly what `name` derives to. The booking path
 * mirrors the shop name until a merchant types their own, so this is what
 * separates "still following" from "deliberately customised".
 */
export function bookingSlugFollowsShopName(slug: string, name: string): boolean {
  const derived = bookingSlugFromShopName(name);
  return derived !== '' && derived === (slug || '').trim();
}

/**
 * Path the booking page should hold after a rename: the new name's path while the
 * current one is still following the old name, otherwise the current path
 * untouched so a merchant's custom path (and the links already shared for it)
 * survives. A name that derives to nothing also leaves the path alone.
 */
export function bookingSlugAfterRename(current: string, previousName: string, nextName: string): string {
  const stored = (current || '').trim();
  const following = !stored || bookingSlugFollowsShopName(stored, previousName);
  if (!following) return current;
  return bookingSlugFromShopName(nextName) || current;
}

/**
 * Path written on Copy link / Save. Prefer the editor value, then the shop-name
 * camelCase path (same as ensureOutletBookingSlug), then a unique kebab suffix.
 * Display and persist must use this so the copied URL is a slug the public page can find.
 */
export function bookingSlugToPersist(editor: string, shopName: string, outletId: string): string {
  const slugRaw = (editor || '').trim();
  return slugRaw || bookingSlugFromShopName(shopName) || uniqueBookingSlug(shopName, outletId);
}

/** Prefer the saved slug; otherwise the same path Copy link will persist (never the raw outlet id). */
export function resolveBookingSlug(
  existing: string | undefined | null,
  name: string,
  outletId: string,
): string {
  return bookingSlugToPersist(existing || '', name, outletId);
}
