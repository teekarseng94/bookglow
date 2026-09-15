import { describe, expect, it } from 'vitest';
import { LANDING_PRICING_PLANS, PLANS } from '../../components/pricing/pricingData';

describe('public pricing', () => {
  it('advertises a single monthly Pro plan at RM20', () => {
    const pro = PLANS.find((plan) => plan.id === 'pro');
    expect(pro?.price).toBe(20);
    expect(pro?.monthlyPrice).toBeUndefined();
    expect(LANDING_PRICING_PLANS.map((plan) => plan.name)).toEqual(['Starter', 'Pro']);
    expect(LANDING_PRICING_PLANS.find((plan) => plan.name === 'Pro')?.price).toBe(20);
  });
});
