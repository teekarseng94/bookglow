import { describe, expect, it } from 'vitest';
import {
  MERCHANT_NAV_CATALOG,
  allowedNavCatalog,
  groupedNavCatalog,
  mobilePrimaryNav,
  moreNavCatalog,
  resolveMerchantPageTitle,
} from './merchantNav';

describe('merchant nav catalog', () => {
  it('keeps sidebar groups, primary tabs, and More items on one list', () => {
    expect(MERCHANT_NAV_CATALOG.map((item) => item.id)).toEqual([
      'dashboard',
      'schedule',
      'pos',
      'member',
      'marketing',
      'menu',
      'sales-reports',
      'transactions',
      'finance',
      'staff',
      'integrations',
      'settings',
      'report',
    ]);
  });

  it('puts admin workday tabs in the bottom nav and the rest in More', () => {
    expect(mobilePrimaryNav('admin').map((item) => item.id)).toEqual([
      'dashboard',
      'schedule',
      'pos',
      'member',
    ]);
    expect(moreNavCatalog('admin').map((item) => item.label)).toEqual([
      'Marketing',
      'Menu & Inventory',
      'Sales Reports',
      'Sales History',
      'Finance',
      'Staff & Team',
      'Integrations',
      'Settings',
      'Report',
    ]);
  });

  it('does not add More entries for cashier because every allowed tab is primary', () => {
    expect(allowedNavCatalog('cashier').map((item) => item.id)).toEqual([
      'pos',
      'member',
      'menu',
      'sales-reports',
    ]);
    expect(moreNavCatalog('cashier')).toEqual([]);
  });

  it('groups allowed items in the desktop sidebar order', () => {
    expect(groupedNavCatalog(allowedNavCatalog('admin')).map((group) => group.label)).toEqual([
      'Workday',
      'Customers',
      'Business',
      'Workspace',
    ]);
  });

  it('resolves nested routes to a shell title', () => {
    expect(resolveMerchantPageTitle('/member-details/abc', 'member')).toBe('Member details');
    expect(resolveMerchantPageTitle('/integrations/google-reviews', 'integrations')).toBe('Google Reviews');
    expect(resolveMerchantPageTitle('/staff', 'staff')).toBe('Staff & Team');
  });
});
