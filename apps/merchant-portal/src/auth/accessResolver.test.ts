import { beforeEach, describe, expect, it } from 'vitest';
import { merchantAccessDestination, merchantBrowserDestination } from './accessResolver';

describe('merchant access destination', () => {
  beforeEach(() => sessionStorage.clear());
  const active = (role: 'owner' | 'admin' | 'manager' | 'cashier') => ({ state: 'active' as const, outletId: 'outlet-1', role, onboardingStatus: 'complete', accessStatus: 'active' });

  it.each(['owner', 'admin', 'manager'] as const)('routes an active %s to dashboard', (role) => {
    expect(merchantAccessDestination(active(role))).toBe('/dashboard');
  });
  it('routes an active cashier to POS', () => expect(merchantAccessDestination(active('cashier'))).toBe('/pos'));
  it('routes access states deterministically', () => {
    expect(merchantAccessDestination({ ...active('owner'), state: 'onboarding' })).toBe('/onboarding');
    expect(merchantAccessDestination({ ...active('owner'), state: 'membership_suspended' })).toBe('/access/account-suspended');
    expect(merchantAccessDestination({ ...active('owner'), state: 'outlet_suspended' })).toBe('/access/workspace-suspended');
    expect(merchantAccessDestination({ state: 'no_workspace', outletId: null, role: null, onboardingStatus: null, accessStatus: null })).toBe('/access/no-workspace');
    expect(merchantAccessDestination({ state: 'platform_admin', outletId: null, role: null, onboardingStatus: null, accessStatus: 'active' })).toBe('/admin/dashboard');
  });
  it('accepts only permitted internal return paths', () => {
    expect(merchantAccessDestination(active('manager'), '/schedule?day=today')).toBe('/schedule?day=today');
    expect(merchantAccessDestination(active('cashier'), '/settings')).toBe('/pos');
    expect(merchantAccessDestination(active('owner'), 'https://evil.example')).toBe('/dashboard');
    expect(merchantAccessDestination(active('owner'), '/book/salon')).toBe('/dashboard');
  });
  it('formats destinations for the existing HashRouter', () => expect(merchantBrowserDestination('/access/no-workspace')).toBe('/#/access/no-workspace'));
});
