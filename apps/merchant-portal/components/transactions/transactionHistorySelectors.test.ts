import { describe, expect, it } from 'vitest';
import { TransactionType, type Client, type Transaction } from '../../types';
import { groupTransactionsByDate, selectTransactions, summarizeTransactions, type TransactionHistoryFilters } from './transactionHistorySelectors';

const client = { id: 'client_1', outletID: 'outlet_1', name: 'Aina Lim' } as Client;
const txn = (id: string, date: string, type: TransactionType, amount: number, description: string, extra: Partial<Transaction> = {}): Transaction => ({ id, outletID: 'outlet_1', date, type, amount, description, category: type === TransactionType.SALE ? 'Treatment' : 'General', ...extra });
const defaults: TransactionHistoryFilters = { search: '', type: 'ALL', sortField: 'date', sortOrder: 'desc', datePeriod: 'THIS_MONTH', customStart: '', customEnd: '' };
const now = new Date(2026, 7, 3, 12);
const records = [
  txn('sale', '2026-08-03T10:00:00', TransactionType.SALE, 108, 'Full body massage', { clientId: client.id, paymentMethod: 'E-wallet' }),
  txn('commission', '2026-08-03T10:01:00', TransactionType.EXPENSE, 4, 'Rahimah commission', { parentSaleId: 'sale' }),
  txn('expense', '2026-08-02T10:00:00', TransactionType.EXPENSE, 25, 'Towels'),
];

describe('transaction history selectors', () => {
  it('filters real records by period, type and useful search fields', () => {
    expect(selectTransactions(records, [client], { ...defaults, search: 'e-wallet', type: 'SALE' }, now).map((item) => item.id)).toEqual(['sale']);
    expect(selectTransactions(records, [client], { ...defaults, type: 'COMMISSION' }, now).map((item) => item.id)).toEqual(['commission']);
  });

  it('calculates totals from the complete filtered dataset', () => {
    expect(summarizeTransactions(records)).toEqual({ totalIn: 108, totalOut: 29, net: 79 });
  });

  it('groups dates with counts and respects ascending or descending group order', () => {
    const desc = groupTransactionsByDate(records, 'desc', now);
    expect(desc.map((group) => [group.label, group.transactions.length])).toEqual([['Today', 2], ['Yesterday', 1]]);
    expect(groupTransactionsByDate(records, 'asc', now).map((group) => group.label)).toEqual(['Yesterday', 'Today']);
  });
});
