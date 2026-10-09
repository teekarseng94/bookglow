/** Integer-cent helpers for POS totals. Catalog prices stay in RM major units. */

export interface PayableLine {
  price: number;
  quantity: number;
  voucherRedemption?: boolean;
  redeemedWithPoints?: boolean;
  originalPrice?: number;
}

export function toCents(major: number): number {
  if (!Number.isFinite(major)) return 0;
  const negative = major < 0;
  const cents = Math.round((Math.abs(major) + 1e-8) * 100);
  return negative ? -cents : cents;
}

export function centsToMajor(cents: number): number {
  return cents / 100;
}

export function lineTotalCents(price: number, quantity: number): number {
  const qty = Number.isFinite(quantity) ? Math.trunc(quantity) : 0;
  return toCents(price) * qty;
}

/** Payable total. Voucher and point-redemption lines contribute nothing. */
export function cartNetCents(lines: readonly PayableLine[]): number {
  return lines.reduce((sum, line) => {
    if (line.voucherRedemption || line.redeemedWithPoints) return sum;
    return sum + lineTotalCents(line.price, line.quantity);
  }, 0);
}

export function cartNetMajor(lines: readonly PayableLine[]): number {
  return centsToMajor(cartNetCents(lines));
}

/**
 * Whole-sale category.
 * A mixed cart that still has a cash/card/credit amount stays `Sales` so paid
 * revenue is not dropped from dashboard totals. `Redemption` is only for a
 * zero-amount voucher or points sale.
 */
export function saleCategory(input: {
  voucherRedemption: boolean;
  hasPointRedemptions: boolean;
  netCents: number;
}): "Redemption" | "Sales" {
  if (input.voucherRedemption) return "Redemption";
  if (input.hasPointRedemptions && input.netCents === 0) return "Redemption";
  return "Sales";
}

export function persistCartLine<T extends PayableLine>(line: T): T {
  if (line.voucherRedemption || line.redeemedWithPoints) {
    const face = line.originalPrice ?? line.price;
    return { ...line, price: 0, originalPrice: face };
  }
  return line;
}

export function cartFingerprint(parts: {
  clientId: string;
  paymentMethod: string;
  lines: readonly (PayableLine & { id: string; staffId?: string })[];
}): string {
  return JSON.stringify({
    clientId: parts.clientId,
    paymentMethod: parts.paymentMethod,
    lines: parts.lines.map((line) => ({
      id: line.id,
      quantity: line.quantity,
      price: toCents(line.price),
      staffId: line.staffId ?? "",
      voucherRedemption: Boolean(line.voucherRedemption),
      redeemedWithPoints: Boolean(line.redeemedWithPoints),
    })),
  });
}

/** Reuse the sale id when the same cart is submitted again after a timeout. */
export function checkoutAttempt(
  previous: { fingerprint: string; id: string } | null,
  fingerprint: string,
  nowMs: number,
): { fingerprint: string; id: string } {
  if (previous && previous.fingerprint === fingerprint) return previous;
  return { fingerprint, id: `txn_${nowMs}` };
}
