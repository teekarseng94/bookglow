import type { Transaction } from '../../types';

export type FinancePeriod = 'this-month' | 'last-month' | 'this-quarter' | 'this-year';
export type ExpenseSource = 'all' | 'commission' | 'inventory' | 'staff' | 'general';

export interface ExpenseLedgerFilters {
  query: string;
  category: string;
  source: ExpenseSource;
  startDate: string;
  endDate: string;
  minimumAmount: string;
  maximumAmount: string;
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addMonths = (date: Date, count: number) => new Date(date.getFullYear(), date.getMonth() + count, 1);
const addYears = (date: Date, count: number) => new Date(date.getFullYear() + count, 0, 1);

export function getFinancePeriodBounds(period: FinancePeriod, now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'last-month') {
    return { start: addMonths(monthStart, -1), end: monthStart, previousStart: addMonths(monthStart, -2), previousEnd: addMonths(monthStart, -1) };
  }
  if (period === 'this-quarter') {
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    return { start: quarterStart, end: addMonths(quarterStart, 3), previousStart: addMonths(quarterStart, -3), previousEnd: quarterStart };
  }
  if (period === 'this-year') {
    const yearStart = new Date(now.getFullYear(), 0, 1);
    return { start: yearStart, end: addYears(yearStart, 1), previousStart: addYears(yearStart, -1), previousEnd: yearStart };
  }
  return { start: monthStart, end: addMonths(monthStart, 1), previousStart: addMonths(monthStart, -1), previousEnd: monthStart };
}

const isInRange = (transaction: Transaction, start: Date, end: Date) => {
  const timestamp = new Date(transaction.date).getTime();
  return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp < end.getTime();
};

export function summarizeExpensePeriod(expenses: Transaction[], period: FinancePeriod, now = new Date()) {
  const bounds = getFinancePeriodBounds(period, now);
  const current = expenses.filter((expense) => isInRange(expense, bounds.start, bounds.end));
  const previous = expenses.filter((expense) => isInRange(expense, bounds.previousStart, bounds.previousEnd));
  const total = current.reduce((sum, expense) => sum + expense.amount, 0);
  const previousTotal = previous.reduce((sum, expense) => sum + expense.amount, 0);
  return {
    current,
    previous,
    total,
    previousTotal,
    amountChangePercent: previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null,
    transactionChangePercent: previous.length > 0 ? ((current.length - previous.length) / previous.length) * 100 : null,
  };
}

export function buildExpenseTrend(expenses: Transaction[], period: FinancePeriod, now = new Date()) {
  const { current } = summarizeExpensePeriod(expenses, period, now);
  const groupByMonth = period === 'this-quarter' || period === 'this-year';
  const totals = new Map<string, { label: string; amount: number; timestamp: number }>();
  current.forEach((expense) => {
    const date = new Date(expense.date);
    const key = groupByMonth
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const existing = totals.get(key);
    totals.set(key, {
      label: groupByMonth
        ? date.toLocaleDateString('en-MY', { month: 'short' })
        : date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }),
      amount: (existing?.amount || 0) + expense.amount,
      timestamp: groupByMonth ? new Date(date.getFullYear(), date.getMonth(), 1).getTime() : startOfDay(date).getTime(),
    });
  });
  return Array.from(totals.values()).sort((a, b) => a.timestamp - b.timestamp);
}

export function getExpenseSource(transaction: Transaction): Exclude<ExpenseSource, 'all'> {
  const text = `${transaction.category} ${transaction.description}`.toLowerCase();
  if (text.includes('commission')) return 'commission';
  if (text.includes('inventory') || text.includes('product') || text.includes('stock')) return 'inventory';
  if (text.includes('staff') || text.includes('incentive') || text.includes('salary') || text.includes('payroll')) return 'staff';
  return 'general';
}

export function filterExpenseLedger(expenses: Transaction[], filters: ExpenseLedgerFilters) {
  const query = filters.query.trim().toLowerCase();
  const minimum = filters.minimumAmount === '' ? null : Number(filters.minimumAmount);
  const maximum = filters.maximumAmount === '' ? null : Number(filters.maximumAmount);
  const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : null;
  const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999`) : null;

  return expenses.filter((expense) => {
    const date = new Date(expense.date);
    if (query && !`${expense.description} ${expense.category}`.toLowerCase().includes(query)) return false;
    if (filters.category && expense.category !== filters.category) return false;
    if (filters.source !== 'all' && getExpenseSource(expense) !== filters.source) return false;
    if (start && date < start) return false;
    if (end && date > end) return false;
    if (minimum != null && Number.isFinite(minimum) && expense.amount < minimum) return false;
    if (maximum != null && Number.isFinite(maximum) && expense.amount > maximum) return false;
    return true;
  });
}

export function expensePeriodTotals(expenses: Transaction[], now = new Date()) {
  const todayStart = startOfDay(now);
  const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate() + 1);
  const weekStart = new Date(todayStart);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = addMonths(monthStart, 1);
  const total = (start: Date, end: Date) => expenses.filter((expense) => isInRange(expense, start, end)).reduce((sum, expense) => sum + expense.amount, 0);
  return { today: total(todayStart, tomorrow), week: total(weekStart, weekEnd), month: total(monthStart, monthEnd) };
}
