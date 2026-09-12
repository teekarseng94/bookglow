import { describe, expect, it } from "vitest";
import {
  appendUniqueReviews,
  formatAggregateRating,
  formatReviewCount,
  formatReviewDate,
  isLongComment,
  parseReviewComment,
  reviewerInitials,
  starFillPercents,
  truncateComment,
  type GoogleReview,
} from "../../services/googleReviewFormat";

const review = (overrides: Partial<GoogleReview>): GoogleReview => ({
  id: "r1",
  authorName: "A Google user",
  avatarUrl: null,
  isAnonymous: false,
  rating: 5,
  comment: null,
  createTime: null,
  updateTime: null,
  ...overrides,
});

describe("google review comment parsing", () => {
  it("passes untranslated comments through untouched", () => {
    const parsed = parseReviewComment("  Great massage, very relaxing.  ");
    expect(parsed).toEqual({ text: "Great massage, very relaxing.", original: null, translated: false });
  });

  it("splits a translation that Google put before the original", () => {
    const parsed = parseReviewComment(
      "(Translated by Google) Very good massage after a long week\n\n(Original)\nUrut yang sangat bagus selepas seminggu panjang",
    );
    expect(parsed.translated).toBe(true);
    expect(parsed.text).toBe("Very good massage after a long week");
    expect(parsed.original).toBe("Urut yang sangat bagus selepas seminggu panjang");
  });

  it("splits a translation that Google put after the original", () => {
    const parsed = parseReviewComment("(Original)\nSangat bagus\n\n(Translated by Google) Very good");
    expect(parsed.translated).toBe(true);
    expect(parsed.text).toBe("Very good");
    expect(parsed.original).toBe("Sangat bagus");
  });

  it("handles a translation with no original block", () => {
    const parsed = parseReviewComment("(Translated by Google) Lovely place");
    expect(parsed).toEqual({ text: "Lovely place", original: null, translated: true });
  });

  it("never invents text for a rating-only review", () => {
    expect(parseReviewComment(null)).toEqual({ text: "", original: null, translated: false });
    expect(parseReviewComment("   ")).toEqual({ text: "", original: null, translated: false });
  });
});

describe("reviewer presentation", () => {
  it("builds initials for the neutral avatar fallback", () => {
    expect(reviewerInitials("Nurul Aisyah Rahman")).toBe("NR");
    expect(reviewerInitials("Kenji")).toBe("K");
    expect(reviewerInitials("   ")).toBe("G");
  });

  it("keeps very long names intact so the card can wrap them", () => {
    const longName = "Abdul".repeat(30);
    expect(reviewerInitials(longName)).toBe("A");
  });

  it("produces fractional star fills for a half rating", () => {
    expect(starFillPercents(4.8)).toEqual([100, 100, 100, 100, 80]);
    expect(starFillPercents(0)).toEqual([0, 0, 0, 0, 0]);
    expect(starFillPercents(9)).toEqual([100, 100, 100, 100, 100]);
  });
});

describe("google aggregate formatting", () => {
  it("uses Google's own rating and count", () => {
    expect(formatAggregateRating(4.8235)).toBe("4.8");
    expect(formatReviewCount(194)).toBe("194");
  });

  it("reports unavailable rather than a false zero", () => {
    expect(formatAggregateRating(null)).toBeNull();
    expect(formatAggregateRating(0)).toBeNull();
    expect(formatReviewCount(null)).toBeNull();
    expect(formatReviewCount(0)).toBe("0");
  });
});

describe("review dates", () => {
  const now = Date.parse("2026-09-12T12:00:00Z");

  it("shows relative time for recent reviews", () => {
    expect(formatReviewDate("2026-09-10T12:00:00Z", now)).toMatch(/2 days ago/i);
    expect(formatReviewDate("2026-09-12T11:59:30Z", now)).toBe("Just now");
  });

  it("falls back to an absolute month for old reviews", () => {
    expect(formatReviewDate("2021-03-04T12:00:00Z", now)).toMatch(/2021/);
  });

  it("returns an empty label for missing or invalid timestamps", () => {
    expect(formatReviewDate(null, now)).toBe("");
    expect(formatReviewDate("not-a-date", now)).toBe("");
  });
});

describe("pagination merging", () => {
  it("appends a page without duplicating entries Google repeats", () => {
    const first = [review({ id: "a" }), review({ id: "b" })];
    const second = [review({ id: "b" }), review({ id: "c" })];
    expect(appendUniqueReviews(first, second).map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("ignores entries with no id", () => {
    const merged = appendUniqueReviews([review({ id: "a" })], [review({ id: "" })]);
    expect(merged).toHaveLength(1);
  });
});

describe("long comments", () => {
  const long = `${"Wonderful treatment. ".repeat(40)}end`;

  it("flags and truncates long comments on a word boundary", () => {
    expect(isLongComment(long)).toBe(true);
    const truncated = truncateComment(long);
    expect(truncated.length).toBeLessThan(long.length);
    expect(truncated.endsWith("…")).toBe(true);
  });

  it("leaves short comments alone", () => {
    expect(isLongComment("Nice")).toBe(false);
    expect(truncateComment("Nice")).toBe("Nice");
  });
});
