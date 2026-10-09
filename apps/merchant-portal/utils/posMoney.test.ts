import { describe, expect, it } from "vitest";
import {
  cartNetCents,
  cartNetMajor,
  checkoutAttempt,
  persistCartLine,
  saleCategory,
} from "./posMoney";

describe("POS money", () => {
  it("sums RM100.00 and RM50.00 as RM150.00", () => {
    const lines = [
      { price: 100, quantity: 1 },
      { price: 50, quantity: 1 },
    ];
    expect(cartNetCents(lines)).toBe(15000);
    expect(cartNetMajor(lines)).toBe(150);
  });

  it("keeps RM99.90 × 3 at exactly 29970 cents", () => {
    expect(cartNetCents([{ price: 99.9, quantity: 3 }])).toBe(29970);
    expect(cartNetMajor([{ price: 99.9, quantity: 3 }])).toBe(299.7);
  });

  it("excludes voucher and point lines from the payable total", () => {
    expect(
      cartNetCents([
        { price: 80, quantity: 1 },
        { price: 50, quantity: 2, redeemedWithPoints: true },
        { price: 40, quantity: 1, voucherRedemption: true },
      ]),
    ).toBe(8000);
  });

  it("marks a mixed paid cart as Sales and a fully redeemed cart as Redemption", () => {
    expect(saleCategory({ voucherRedemption: false, hasPointRedemptions: true, netCents: 8000 })).toBe(
      "Sales",
    );
    expect(saleCategory({ voucherRedemption: false, hasPointRedemptions: true, netCents: 0 })).toBe(
      "Redemption",
    );
    expect(saleCategory({ voucherRedemption: true, hasPointRedemptions: false, netCents: 0 })).toBe(
      "Redemption",
    );
  });

  it("snapshots a zero price and keeps the face value on redeemed lines", () => {
    expect(persistCartLine({ price: 50, quantity: 1, redeemedWithPoints: true })).toEqual({
      price: 0,
      quantity: 1,
      redeemedWithPoints: true,
      originalPrice: 50,
    });
  });

  it("reuses the checkout id for an identical retry", () => {
    const first = checkoutAttempt(null, "cart-a", 1000);
    const retry = checkoutAttempt(first, "cart-a", 5000);
    const changed = checkoutAttempt(retry, "cart-b", 9000);
    expect(retry.id).toBe(first.id);
    expect(changed.id).toBe("txn_9000");
  });
});
