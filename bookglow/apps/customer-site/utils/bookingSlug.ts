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

/** Letters, numbers, underscores, hyphens; must start with a letter (supports camelCase). */
export const BOOKING_SLUG_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export function isValidBookingSlug(s: string): boolean {
  const t = (s || "").trim();
  return t.length > 0 && BOOKING_SLUG_REGEX.test(t);
}
