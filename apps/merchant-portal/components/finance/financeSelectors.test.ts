import { describe, expect, it } from 'vitest';
import { TransactionType, type Transaction } from '../../types';
import {
  buildExpenseTrend,
  expensePeriodTotals,
  filterExpenseLedger,
  summarizeExpensePeriod,
  type ExpenseLedgerFilters,
} from './financeSelectors';

const expense = (id: string, date: string, amount: number, category: string, description: string): Transaction => ({
  id,
  outletID: 'outlet_test',
  date,
  type: TransactionType.EXPENSE,
  amount,
  category,
  description,
});

const noFilters: ExpenseLedgerFilters = {
  query: '',
  category: '',
  source: 'all',
  startDate: '',
  endDate: '',
  minimumAmount: '',
  maximumAmount: '',
};

describe('financeSelectors', () => {
  const now = new Date(2026, 7, 12, 12);
  const expenses = [
    expense('one', '2026-08-02T10:00:00', 40, 'Commission', 'Commission: Rahimah'),
    expense('two', '2026-08-02T15:00:00', 60, 'Commission', 'Commission: Aina'),
    expense('three', '2026-08-10T09:00:00', 25, 'Inventory', 'Products: towels'),
    expense('previous', '2026-07-12T09:00:00', 50, 'Staff', 'Staff incentive'),
  ];

  it('calculates current and previous period values from real expenses', () => {
    const summary = summarizeExpensePeriod(expenses, 'this-month', now);

    expect(summary.total).toBe(125);
    expect(summary.previousTotal).toBe(50);
    expect(summary.amountChangePercent).toBe(150);
    expect(summary.transactionChangePercent).toBe(200);
  });

  it('groups the chart by transaction date and does not invent points', () => {
    const trend = buildExpenseTrend(expenses, 'this-month', now);

    expect(trend).toHaveLength(2);
    expect(trend.map((point) => point.amount)).toEqual([100, 25]);
  });

  it('filters by search, source, date and amount together', () => {
    const filtered = filterExpenseLedger(expenses, {
      ...noFilters,
      query: 'commission',
      source: 'commission',
      startDate: '2026-08-02',
      endDate: '2026-08-02',
      minimumAmount: '50',
    });

    expect(filtered.map((item) => item.id)).toEqual(['two']);
  });

  it('calculates today, Monday-based week and month totals', () => {
    const totals = expensePeriodTotals([
      ...expenses,
      expense('today', '2026-08-12T08:00:00', 10, 'Other', 'Coffee'),
    ], now);

    expect(totals.today).toBe(10);
    expect(totals.week).toBe(35);
    expect(totals.month).toBe(135);
  });
});
