import { describe, expect, it } from "vitest";
import {
  matchesPublicBookingSegment,
  normalizeBookingPathSegment,
  uniqueBookingSlug,
} from "../../utils/bookingSlug";

describe("normalizeBookingPathSegment", () => {
  it("trims slashes and decodes URI encoding", () => {
    expect(normalizeBookingPathSegment(" restoranDesaPetaling ")).toBe("restoranDesaPetaling");
    expect(normalizeBookingPathSegment("harbour%20Spa")).toBe("harbour Spa");
    expect(normalizeBookingPathSegment("/business-12ab34/")).toBe("business-12ab34");
  });
});

describe("matchesPublicBookingSegment", () => {
  const outletId = "outlet_aaaaaaaaaaaaaaaaaaaaaaaaaa12ab34";

  it("matches a stored kebab slug against the Settings camelCase shop-name URL", () => {
    expect(
      matchesPublicBookingSegment(
        "restoranDesaPetaling",
        "restoran-desa-petaling-12ab34",
        "Restoran Desa Petaling",
        outletId,
      ),
    ).toBe(true);
  });

  it("matches the unique kebab-suffix path Settings used to copy before persist", () => {
    expect(
      matchesPublicBookingSegment(
        uniqueBookingSlug("Harbour Spa", outletId),
        "harbourSpa",
        "Harbour Spa",
        outletId,
      ),
    ).toBe(true);
  });

  it("rejects a segment that belongs to a different shop", () => {
    expect(
      matchesPublicBookingSegment("otherShop", "harbourSpa", "Harbour Spa", outletId),
    ).toBe(false);
  });
});
