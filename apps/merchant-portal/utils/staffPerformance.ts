import { TransactionType, type CartItem, type Staff, type Transaction } from '../types';

export type StaffPerformancePeriod = 'month' | 'year' | 'all' | 'custom';

export interface StaffPerformanceLine extends CartItem {
  date: string;
  saleId: string;
}

export interface StaffPerformanceTotals {
  totalServices: number;
  totalRevenue: number;
  totalCommission: number;
  history: StaffPerformanceLine[];
}

interface StaffPerformanceOptions {
  period: StaffPerformancePeriod;
  startDate?: string;
  endDate?: string;
  now?: Date;
}

const emptyTotals = (): StaffPerformanceTotals => ({
  totalServices: 0,
  totalRevenue: 0,
  totalCommission: 0,
  history: [],
});

const isVoided = (transaction: Transaction) => transaction.status?.toLowerCase() === 'voided';

function periodBounds({ period, startDate, endDate, now = new Date() }: StaffPerformanceOptions) {
  if (period === 'all') return null;
  if (period === 'custom') {
    if (!startDate || !endDate) return null;
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  if (period === 'year') {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear() + 1, 0, 1),
    };
  }
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

function isInPeriod(transaction: Transaction, options: StaffPerformanceOptions) {
  const bounds = periodBounds(options);
  if (!bounds) return true;
  const timestamp = new Date(transaction.date).getTime();
  return Number.isFinite(timestamp)
    && timestamp >= bounds.start.getTime()
    && timestamp < bounds.end.getTime();
}

export function normalizeStaffName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Aggregates staff results from the same transaction rows used by Finance and Sales History.
 * Stable `items[].staffId` attribution always wins. Legacy description matching is only used
 * when exactly one uniquely named staff member is present in the commission description.
 */
export function buildStaffPerformance(
  staff: Pick<Staff, 'id' | 'name'>[],
  transactions: Transaction[],
  options: StaffPerformanceOptions,
) {
  const totals = new Map<string, StaffPerformanceTotals>(staff.map((member) => [member.id, emptyTotals()]));
  const activeSales = transactions.filter((transaction) => (
    transaction.type === TransactionType.SALE
    && !isVoided(transaction)
    && isInPeriod(transaction, options)
  ));
  const salesById = new Map(activeSales.map((sale) => [sale.id, sale]));

  for (const sale of activeSales) {
    for (const item of sale.items || []) {
      if (!item.staffId) continue;
      const memberTotals = totals.get(item.staffId);
      if (!memberTotals) continue;
      memberTotals.totalServices += 1;
      memberTotals.totalRevenue += item.price * item.quantity;
      memberTotals.history.push({ ...item, date: sale.date, saleId: sale.id });
    }
  }

  const commissionSales = new Set<string>();
  const normalizedNames = new Map<string, string[]>();
  for (const member of staff) {
    const normalized = normalizeStaffName(member.name);
    if (!normalized) continue;
    normalizedNames.set(normalized, [...(normalizedNames.get(normalized) || []), member.id]);
  }

  const commissionTransactions = transactions.filter((transaction) => (
    transaction.type === TransactionType.EXPENSE
    && transaction.category.trim().toLowerCase() === 'commission'
    && !isVoided(transaction)
    && isInPeriod(transaction, options)
  ));

  for (const commission of commissionTransactions) {
    if (commission.parentSaleId) commissionSales.add(commission.parentSaleId);

    const stableLines = (commission.items || []).filter((item) => (
      Boolean(item.staffId)
      && Number(item.commissionEarned) > 0
      && totals.has(item.staffId as string)
    ));
    if (stableLines.length > 0) {
      for (const line of stableLines) {
        totals.get(line.staffId as string)!.totalCommission += Number(line.commissionEarned) || 0;
      }
      continue;
    }

    const parentSale = commission.parentSaleId ? salesById.get(commission.parentSaleId) : undefined;
    const parentLines = (parentSale?.items || []).filter((item) => (
      Boolean(item.staffId)
      && Number(item.commissionEarned) > 0
      && totals.has(item.staffId as string)
    ));
    if (parentLines.length > 0) {
      for (const line of parentLines) {
        totals.get(line.staffId as string)!.totalCommission += Number(line.commissionEarned) || 0;
      }
      continue;
    }

    const description = normalizeStaffName(commission.description);
    const candidates = new Set<string>();
    for (const [name, ids] of normalizedNames) {
      if (ids.length === 1 && (` ${description} `).includes(` ${name} `)) candidates.add(ids[0]);
    }
    if (candidates.size === 1) {
      totals.get([...candidates][0])!.totalCommission += commission.amount;
    }
  }

  // Compatibility for sales created before a child commission expense was introduced.
  // A linked commission transaction always wins so the same earning is never counted twice.
  for (const sale of activeSales) {
    if (commissionSales.has(sale.id)) continue;
    for (const item of sale.items || []) {
      if (!item.staffId || !totals.has(item.staffId)) continue;
      totals.get(item.staffId)!.totalCommission += Number(item.commissionEarned) || 0;
    }
  }

  return totals;
}

export function formatMYR(amount: number) {
  return `RM ${Number(amount || 0).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
