import { describe, expect, it } from 'vitest';
import { TransactionType, type Transaction } from '../types';
import { buildStaffPerformance, formatMYR } from './staffPerformance';

const outletID = 'outlet-1';
const sale = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'sale-1',
  outletID,
  date: '2026-09-10T13:00:00+08:00',
  type: TransactionType.SALE,
  amount: 70,
  category: 'Sales',
  description: 'Sale: 1. Full Body Massage 60mins',
  items: [{
    id: 'service-full-body',
    name: '1. Full Body Massage 60mins',
    price: 70,
    quantity: 1,
    type: 'service',
    staffId: 'rentro-id',
    commissionEarned: 35,
  }],
  ...overrides,
});

const commission = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'commission-1',
  outletID,
  date: '2026-09-10T13:00:00+08:00',
  type: TransactionType.EXPENSE,
  amount: 35,
  category: 'Commission',
  description: 'Commission: Rentro - 1. Full Body Massage 60mins',
  parentSaleId: 'sale-1',
  ...overrides,
});

const options = { period: 'month' as const, now: new Date('2026-09-10T12:00:00+08:00') };

describe('buildStaffPerformance', () => {
  it('reconciles the Rentro sale and legacy commission without double counting', () => {
    const result = buildStaffPerformance(
      [{ id: 'rentro-id', name: 'Rentro' }],
      [sale(), commission()],
      options,
    ).get('rentro-id');

    expect(result).toMatchObject({
      totalServices: 1,
      totalRevenue: 70,
      totalCommission: 35,
    });
    expect(result?.history).toHaveLength(1);
  });

  it('uses canonical commission items after a staff member is renamed', () => {
    const canonicalCommission = commission({
      description: 'Commission: Previous Name - 1. Full Body Massage 60mins',
      items: [{
        id: 'service-full-body',
        name: '1. Full Body Massage 60mins',
        price: 0,
        quantity: 1,
        type: 'service',
        staffId: 'rentro-id',
        commissionEarned: 35,
      }],
    });
    const result = buildStaffPerformance(
      [{ id: 'rentro-id', name: 'Rentro Renamed' }],
      [sale(), canonicalCommission],
      options,
    ).get('rentro-id');

    expect(result?.totalCommission).toBe(35);
  });

  it('matches a legacy description only when the normalized staff name is unambiguous', () => {
    const noParent = commission({ parentSaleId: undefined, description: 'Commission: AMÁDA - Foot Massage' });
    const unique = buildStaffPerformance(
      [{ id: 'amada-id', name: 'Amada' }],
      [noParent],
      options,
    );
    expect(unique.get('amada-id')?.totalCommission).toBe(35);

    const ambiguous = buildStaffPerformance(
      [{ id: 'amada-1', name: 'Amada' }, { id: 'amada-2', name: 'Amada' }],
      [noParent],
      options,
    );
    expect(ambiguous.get('amada-1')?.totalCommission).toBe(0);
    expect(ambiguous.get('amada-2')?.totalCommission).toBe(0);
  });

  it('excludes voided and out-of-period sales and commissions', () => {
    const result = buildStaffPerformance(
      [{ id: 'rentro-id', name: 'Rentro' }],
      [
        sale({ status: 'voided' }),
        commission({ status: 'voided' }),
        sale({ id: 'sale-old', date: '2026-08-10T13:00:00+08:00' }),
      ],
      options,
    ).get('rentro-id');

    expect(result).toMatchObject({ totalServices: 0, totalRevenue: 0, totalCommission: 0 });
  });
});

describe('formatMYR', () => {
  it('formats positive staff earnings in Malaysia Ringgit', () => {
    expect(formatMYR(35)).toBe('RM 35.00');
    expect(formatMYR(2751.5)).toBe('RM 2,751.50');
  });
});
