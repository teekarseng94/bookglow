export interface LoyaltyLine {
  price: number;
  quantity: number;
  points?: number;
  voucherRedemption?: boolean;
  redeemedWithPoints?: boolean;
}

/** Loyalty still runs when a sale has no commission lines. */
export function shouldAwardLoyaltyPoints(input: {
  type: string;
  clientId?: string;
  category?: string;
}): boolean {
  return (
    input.type === "SALE" &&
    Boolean(input.clientId) &&
    input.clientId !== "guest" &&
    input.category !== "Redemption" &&
    input.category !== "Voucher"
  );
}

export function earnedLoyaltyPoints(items: readonly LoyaltyLine[] | undefined, amount: number): number {
  if (!items || items.length === 0) return Math.floor(amount);
  return items.reduce((sum, item) => {
    if (item.voucherRedemption || item.redeemedWithPoints) return sum;
    const itemPoints = item.points !== undefined ? item.points : Math.floor(item.price);
    return sum + itemPoints * item.quantity;
  }, 0);
}
