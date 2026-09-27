/** Convert a display name like "Bali Wellness" to a URL segment like "baliWellness". */
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

/** Prefer the saved slug; otherwise allocate a unique public path (never the raw outlet id). */
export function resolveBookingSlug(
  existing: string | undefined | null,
  name: string,
  outletId: string,
): string {
  const stored = (existing || '').trim();
  if (stored) return stored;
  return uniqueBookingSlug(name, outletId);
}
