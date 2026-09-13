import { describe, expect, it } from 'vitest';
import { calculateMrr } from './SuperAdminSubscriptions';
import type { PlatformSubscription } from '../services/platformOperationsService';

const subscription = (patch: Partial<PlatformSubscription> = {}): PlatformSubscription => ({ id: 'sub', outletId: 'outlet', priceId: 'price', status: 'active', cancelAtPeriodEnd: false, currentPeriodEnd: null, unitAmount: 12000, currency: 'myr', recurringInterval: 'year', intervalCount: 1, quantity: 1, discountPercent: null, mrrReliable: true, ...patch });

describe('subscription MRR', () => {
  it('normalizes annual plans, applies percentage discounts, and excludes trials', () => {
    const result = calculateMrr([subscription({ discountPercent: 10 }), subscription({ id: 'trial', status: 'trialing', unitAmount: 999999 })]);
    expect(result.values).toEqual(['MYR 9.00']);
  });

  it('reports unavailable instead of fabricating MRR when recurring metadata is incomplete', () => {
    const result = calculateMrr([subscription({ unitAmount: null })]);
    expect(result.unavailable).toBe(true);
    expect(result.values).toEqual([]);
  });
});
