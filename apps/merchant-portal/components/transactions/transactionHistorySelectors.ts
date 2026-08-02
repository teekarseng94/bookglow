import type { Client, Transaction } from '../../types';
import { TransactionType } from '../../types';

export type TransactionFilter = 'ALL' | 'SALE' | 'COMMISSION' | 'EXPENSE';
export type TransactionSortField = 'date' | 'amount' | 'client';
export type TransactionSortOrder = 'asc' | 'desc';
export type TransactionDatePeriod = 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

export interface TransactionHistoryFilters {
  search: string;
  type: TransactionFilter;
  sortField: TransactionSortField;
  sortOrder: TransactionSortOrder;
  datePeriod: TransactionDatePeriod;
  customStart: string;
  customEnd: string;
}

export const isCommissionTransaction = (transaction: Transaction) =>
  transaction.type === TransactionType.EXPENSE &&
  (Boolean(transaction.parentSaleId) || /commission/i.test(`${transaction.category} ${transaction.description}`));

export function transactionPeriodBounds(period: TransactionDatePeriod, now = new Date(), customStart = '', customEnd = '') {
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'THIS_WEEK') {
    const start = new Date(dayStart);
    start.setDate(start.getDate() - (start.getDay() === 0 ? 6 : start.getDay() - 1));
    const end = new Date(start); end.setDate(end.getDate() + 7);
    return { start, end };
  }
  if (period === 'LAST_MONTH') {
    return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 1) };
  }
  if (period === 'CUSTOM') {
    const customEndDate = customEnd ? new Date(`${customEnd}T00:00:00`) : null;
    if (customEndDate) customEndDate.setDate(customEndDate.getDate() + 1);
    return {
      start: customStart ? new Date(`${customStart}T00:00:00`) : null,
      end: customEndDate,
    };
  }
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
}

export function selectTransactions(transactions: Transaction[], clients: Client[], filters: TransactionHistoryFilters, now = new Date()) {
  const query = filters.search.trim().toLowerCase();
  const { start, end } = transactionPeriodBounds(filters.datePeriod, now, filters.customStart, filters.customEnd);
  const clientNames = new Map(clients.map((client) => [client.id, client.name]));
  const filtered = transactions.filter((transaction) => {
    if (transaction.status === 'voided') return false;
    const commission = isCommissionTransaction(transaction);
    const matchesType = filters.type === 'ALL' ||
      (filters.type === 'SALE' && transaction.type === TransactionType.SALE) ||
      (filters.type === 'COMMISSION' && commission) ||
      (filters.type === 'EXPENSE' && transaction.type === TransactionType.EXPENSE && !commission);
    if (!matchesType) return false;
    const timestamp = new Date(transaction.date);
    if (start && timestamp < start) return false;
    if (end && timestamp >= end) return false;
    const clientName = clientNames.get(transaction.clientId || '') || (transaction.type === TransactionType.SALE ? 'Guest' : '');
    const recordType = transaction.type === TransactionType.SALE ? 'sale' : commission ? 'commission' : 'expense';
    return !query || `${transaction.description} ${transaction.category} ${transaction.paymentMethod || ''} ${clientName} ${recordType}`.toLowerCase().includes(query);
  });
  return filtered.sort((a, b) => {
    let comparison = 0;
    if (filters.sortField === 'amount') comparison = a.amount - b.amount;
    else if (filters.sortField === 'client') comparison = (clientNames.get(a.clientId || '') || 'Guest').localeCompare(clientNames.get(b.clientId || '') || 'Guest');
    else comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    return filters.sortOrder === 'asc' ? comparison : -comparison;
  });
}

export function summarizeTransactions(transactions: Transaction[]) {
  const totalIn = transactions.filter((item) => item.type === TransactionType.SALE).reduce((sum, item) => sum + item.amount, 0);
  const totalOut = transactions.filter((item) => item.type === TransactionType.EXPENSE).reduce((sum, item) => sum + item.amount, 0);
  return { totalIn, totalOut, net: totalIn - totalOut };
}

export interface TransactionDateGroup { key: string; label: string; transactions: Transaction[] }

export function groupTransactionsByDate(transactions: Transaction[], order: TransactionSortOrder, now = new Date()): TransactionDateGroup[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const groups = new Map<string, Transaction[]>();
  transactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    groups.set(key, [...(groups.get(key) || []), transaction]);
  });
  return Array.from(groups.entries()).map(([key, items]) => {
    const date = new Date(`${key}T00:00:00`);
    const time = date.getTime();
    const label = time === today ? 'Today' : time === yesterday ? 'Yesterday' : date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
    return { key, label, transactions: items };
  }).sort((a, b) => order === 'asc' ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key));
}
