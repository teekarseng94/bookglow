import { describe, expect, it } from "vitest";
import { earnedLoyaltyPoints, shouldAwardLoyaltyPoints } from "./saleFollowUp";

describe("sale loyalty follow-up", () => {
  it("awards points for a paid member sale even when commission is absent", () => {
    expect(shouldAwardLoyaltyPoints({ type: "SALE", clientId: "client-1", category: "Sales" })).toBe(true);
  });

  it("does not award points for guest, voucher, or full redemption sales", () => {
    expect(shouldAwardLoyaltyPoints({ type: "SALE", clientId: "guest", category: "Sales" })).toBe(false);
    expect(shouldAwardLoyaltyPoints({ type: "SALE", clientId: "client-1", category: "Voucher" })).toBe(false);
    expect(shouldAwardLoyaltyPoints({ type: "SALE", clientId: "client-1", category: "Redemption" })).toBe(false);
  });

  it("skips redeemed lines and keeps points on the paid lines", () => {
    expect(
      earnedLoyaltyPoints(
        [
          { price: 80, quantity: 1, points: 8 },
          { price: 50, quantity: 2, points: 50, redeemedWithPoints: true },
        ],
        80,
      ),
    ).toBe(8);
  });
});
