/**
 * Pure display helpers for Google reviews.
 *
 * Kept free of network and DOM access so the booking page behaviour (translation
 * attribution, long comments, rating-only reviews, de-duplicated pagination) can
 * be unit tested directly.
 */

export type GoogleReviewSort = "newest" | "highest" | "lowest";

export const GOOGLE_REVIEW_SORTS: { id: GoogleReviewSort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "highest", label: "Highest rated" },
  { id: "lowest", label: "Lowest rated" },
];

export interface GoogleReview {
  id: string;
  authorName: string;
  avatarUrl: string | null;
  isAnonymous: boolean;
  rating: number | null;
  comment: string | null;
  createTime: string | null;
  updateTime: string | null;
}

const TRANSLATED_MARKER = "(Translated by Google)";
const ORIGINAL_MARKER = "(Original)";

export interface ParsedComment {
  /** Text to show first. Empty string for rating-only reviews. */
  text: string;
  /** The reviewer's own wording when Google supplied a translation. */
  original: string | null;
  translated: boolean;
}

/**
 * Google returns translations inline in `comment`, and the order of the
 * translated and original blocks is not guaranteed.
 */
export function parseReviewComment(comment: string | null | undefined): ParsedComment {
  const raw = typeof comment === "string" ? comment : "";
  if (!raw.trim()) return { text: "", original: null, translated: false };

  const translatedAt = raw.indexOf(TRANSLATED_MARKER);
  const originalAt = raw.indexOf(ORIGINAL_MARKER);

  if (translatedAt < 0 && originalAt < 0) {
    return { text: raw.trim(), original: null, translated: false };
  }

  if (translatedAt >= 0 && originalAt > translatedAt) {
    return {
      text: raw.slice(translatedAt + TRANSLATED_MARKER.length, originalAt).trim(),
      original: raw.slice(originalAt + ORIGINAL_MARKER.length).trim() || null,
      translated: true,
    };
  }

  if (translatedAt >= 0 && originalAt >= 0) {
    return {
      text: raw.slice(translatedAt + TRANSLATED_MARKER.length).trim(),
      original: raw.slice(originalAt + ORIGINAL_MARKER.length, translatedAt).trim() || null,
      translated: true,
    };
  }

  if (translatedAt >= 0) {
    return { text: raw.slice(translatedAt + TRANSLATED_MARKER.length).trim(), original: null, translated: true };
  }

  return {
    text: raw.slice(0, originalAt).trim(),
    original: raw.slice(originalAt + ORIGINAL_MARKER.length).trim() || null,
    translated: true,
  };
}

/** Initials for the neutral avatar fallback. */
export function reviewerInitials(name: string): string {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "G";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const RELATIVE_STEPS: [number, Intl.RelativeTimeFormatUnit][] = [
  [60_000, "minute"],
  [3_600_000, "hour"],
  [86_400_000, "day"],
  [604_800_000, "week"],
  [2_629_800_000, "month"],
  [31_557_600_000, "year"],
];

/** Relative time when recent, absolute date once it stops being useful. */
export function formatReviewDate(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "";
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const elapsed = now - time;
  if (elapsed < 60_000) return "Just now";

  for (let index = RELATIVE_STEPS.length - 1; index >= 0; index -= 1) {
    const [ms, unit] = RELATIVE_STEPS[index];
    if (elapsed >= ms) {
      const value = Math.floor(elapsed / ms);
      if (unit === "year" && value >= 2) {
        return new Date(time).toLocaleDateString(undefined, { year: "numeric", month: "short" });
      }
      return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(-value, unit);
    }
  }
  return new Date(time).toLocaleDateString(undefined, { dateStyle: "medium" } as Intl.DateTimeFormatOptions);
}

/** Google's aggregate rating, never a value computed from loaded cards. */
export function formatAggregateRating(rating: number | null | undefined): string | null {
  if (typeof rating !== "number" || !Number.isFinite(rating) || rating <= 0) return null;
  return rating.toFixed(1);
}

export function formatReviewCount(count: number | null | undefined): string | null {
  if (typeof count !== "number" || !Number.isFinite(count) || count < 0) return null;
  return count.toLocaleString();
}

/** Fractional star fill percentages for a 5-star row. */
export function starFillPercents(rating: number): number[] {
  const clamped = Math.max(0, Math.min(5, Number.isFinite(rating) ? rating : 0));
  return [0, 1, 2, 3, 4].map((index) => Math.round(Math.max(0, Math.min(1, clamped - index)) * 1000) / 10);
}

/**
 * Appends a page while dropping ids already on screen. Google documents that
 * pages after the first can occasionally repeat or omit entries.
 */
export function appendUniqueReviews(current: GoogleReview[], incoming: GoogleReview[]): GoogleReview[] {
  const seen = new Set(current.map((review) => review.id));
  const merged = [...current];
  for (const review of incoming) {
    if (!review?.id || seen.has(review.id)) continue;
    seen.add(review.id);
    merged.push(review);
  }
  return merged;
}

export const LONG_COMMENT_CHARS = 280;

export function isLongComment(text: string): boolean {
  return text.length > LONG_COMMENT_CHARS;
}

export function truncateComment(text: string): string {
  if (!isLongComment(text)) return text;
  const slice = text.slice(0, LONG_COMMENT_CHARS);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > LONG_COMMENT_CHARS - 60 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}
