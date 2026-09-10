import React, { useMemo, useState } from 'react';
import { ArrowDown, BarChart3, CalendarDays, ChevronDown, HandCoins, Package, ReceiptText, Search, SlidersHorizontal, Trash2, UsersRound, WalletCards } from 'lucide-react';
import type { Transaction } from '../../types';
import { AppSheet, Button, ConfirmationDialog, Field, fieldControlClassName, ModalFooterActions } from '../ui';
import { cx } from '../ui/cx';
import ExpenseDetailsSheet from './ExpenseDetailsSheet';
import {
  buildExpenseTrend,
  expensePeriodTotals,
  filterExpenseLedger,
  getExpenseSource,
  summarizeExpensePeriod,
  type ExpenseLedgerFilters,
  type FinancePeriod,
} from './financeSelectors';

interface MobileFinanceOverviewProps {
  expenses: Transaction[];
  categories: string[];
  onOpenCategories: () => void;
  onRecordExpense: () => void;
  onDeleteExpense: (id: string) => void | Promise<void>;
  canDelete: boolean;
}

const emptyFilters: ExpenseLedgerFilters = { query: '', category: '', source: 'all', startDate: '', endDate: '', minimumAmount: '', maximumAmount: '' };
const money = (value: number) => `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const periodLabels: Record<FinancePeriod, string> = { 'this-month': 'This Month', 'last-month': 'Last Month', 'this-quarter': 'This Quarter', 'this-year': 'This Year' };

const ChangeBadge: React.FC<{ value: number | null }> = ({ value }) => value == null ? null : (
  <span className={cx('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold', value > 0 ? 'bg-[var(--danger-soft)] text-[var(--danger)]' : 'bg-[var(--success-soft)] text-[var(--success)]')}>
    {value > 0 ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
  </span>
);

const PeriodCard: React.FC<{ label: string; amount: number; icon: React.ReactNode; tone: string }> = ({ label, amount, icon, tone }) => (
  <article className="min-w-0 rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] p-3 shadow-ui-xs sm:flex sm:items-center sm:gap-3 sm:p-4">
    <div className={cx('mb-2 grid h-9 w-9 shrink-0 place-items-center rounded-ui-sm sm:mb-0', tone)}>{icon}</div>
    <div className="min-w-0">
      <p className="truncate text-[11px] font-semibold text-[var(--text-muted)] sm:text-xs">{label}</p>
      <p className="mt-0.5 whitespace-nowrap text-[clamp(10px,2.8vw,16px)] font-bold leading-4 tabular-nums text-[var(--danger)]">-{money(amount)}</p>
    </div>
  </article>
);

const ExpenseIcon: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  const source = getExpenseSource(transaction);
  const config = source === 'commission'
    ? { icon: <HandCoins className="h-5 w-5" />, className: 'bg-[var(--danger-soft)] text-[var(--danger)]' }
    : source === 'inventory'
      ? { icon: <Package className="h-5 w-5" />, className: 'bg-[var(--warning-soft)] text-[var(--warning)]' }
      : source === 'staff'
        ? { icon: <UsersRound className="h-5 w-5" />, className: 'bg-[var(--brand-soft)] text-[var(--brand)]' }
        : { icon: <ReceiptText className="h-5 w-5" />, className: 'bg-[var(--bg-soft)] text-[var(--text-secondary)]' };
  return <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-ui-md', config.className)} aria-hidden>{config.icon}</span>;
};

const ExpenseTrendChart: React.FC<{ data: Array<{ label: string; amount: number }> }> = ({ data }) => {
  const maximum = Math.max(...data.map((point) => point.amount), 1);
  const points = data.map((point, index) => ({
    ...point,
    x: data.length === 1 ? 50 : (index / (data.length - 1)) * 100,
    y: 92 - (point.amount / maximum) * 84,
  }));
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  const labelStep = Math.max(1, Math.ceil(data.length / 5));
  const labels = points.filter((_, index) => index === 0 || index === points.length - 1 || index % labelStep === 0);
  const compact = (value: number) => value >= 1000 ? `${Math.round(value / 100) / 10}k` : Math.round(value).toLocaleString('en-MY');

  return (
    <div className="relative h-full min-w-0" role="img" aria-label={`Expense trend from ${data[0]?.label} to ${data[data.length - 1]?.label}`}>
      <span className="absolute left-0 top-0 text-[9px] tabular-nums text-[var(--text-muted)]">{compact(maximum)}</span>
      <span className="absolute bottom-5 left-0 text-[9px] tabular-nums text-[var(--text-muted)]">0</span>
      <svg className="absolute left-9 top-1 h-[calc(100%-1.75rem)] w-[calc(100%-2.75rem)] overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <line x1="0" y1="8" x2="100" y2="8" stroke="var(--line-soft)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="var(--line-soft)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="92" x2="100" y2="92" stroke="var(--line-soft)" vectorEffect="non-scaling-stroke" />
        <polygon points={`0,92 ${linePoints} 100,92`} fill="var(--brand-soft)" opacity="0.8" />
        {points.length > 1 ? <polyline points={linePoints} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" /> : null}
        {points.map((point, index) => (
          <circle key={`${point.label}-${index}`} cx={point.x} cy={point.y} r={points.length === 1 ? 2.2 : 1.25} fill="var(--brand)" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke">
            <title>{point.label}: {money(point.amount)}</title>
          </circle>
        ))}
      </svg>
      <div className="absolute inset-x-9 bottom-0 flex justify-between gap-2 text-[9px] text-[var(--text-muted)]">
        {labels.map((point, index) => <span key={`${point.label}-${index}`} className="whitespace-nowrap">{point.label}</span>)}
      </div>
    </div>
  );
};

export const MobileFinanceOverview: React.FC<MobileFinanceOverviewProps> = ({ expenses, categories, onOpenCategories, onRecordExpense, onDeleteExpense, canDelete }) => {
  const [period, setPeriod] = useState<FinancePeriod>('this-month');
  const [filters, setFilters] = useState<ExpenseLedgerFilters>(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Transaction | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Transaction | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const summary = useMemo(() => summarizeExpensePeriod(expenses, period), [expenses, period]);
  const trend = useMemo(() => buildExpenseTrend(expenses, period), [expenses, period]);
  const periodTotals = useMemo(() => expensePeriodTotals(expenses), [expenses]);
  const filtered = useMemo(() => filterExpenseLedger(expenses, filters), [expenses, filters]);
  const visibleExpenses = showAll ? filtered : filtered.slice(0, 6);
  const activeFilterCount = [filters.category, filters.source !== 'all' ? filters.source : '', filters.startDate, filters.endDate, filters.minimumAmount, filters.maximumAmount].filter(Boolean).length;
  const clearFilters = () => { setFilters(emptyFilters); setShowAll(false); };
  const requestDelete = (expense: Transaction) => {
    if (!canDelete || (getExpenseSource(expense) === 'commission' && expense.parentSaleId)) return;
    setDeletingExpense(expense);
  };
  const confirmDelete = async () => {
    if (!deletingExpense) return;
    setDeleteBusy(true);
    try {
      await onDeleteExpense(deletingExpense.id);
      setDeletingExpense(null);
      setSelectedExpense((current) => current?.id === deletingExpense.id ? null : current);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="m-page-with-bottom-nav mx-auto w-full max-w-[1440px] space-y-4 bg-[var(--bg-canvas)] pb-[calc(var(--mobile-bottom-nav-height)+var(--mobile-safe-area-bottom)+0.75rem)] sm:space-y-5 sm:pb-8 lg:space-y-6">
      <div className="grid grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] gap-2.5 sm:ml-auto sm:w-full sm:max-w-md">
        <Button variant="outline" className="h-11 min-w-0 px-3" onClick={onOpenCategories}>Categories</Button>
        <Button className="h-11 min-w-0 px-3" onClick={onRecordExpense}>Record Expense</Button>
      </div>

      <section className="rounded-ui-lg border border-[#ded5f5] bg-gradient-to-br from-white via-[#fbf9ff] to-[#f4efff] p-4 text-[var(--text-primary)] shadow-ui-sm sm:p-5 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex min-w-0 items-center gap-2 text-base font-bold sm:text-xl"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-ui-sm bg-[var(--brand-soft)] text-[var(--brand)]"><BarChart3 className="h-5 w-5" /></span> Cashflow Overview</h2>
          <label className="relative shrink-0">
            <span className="sr-only">Overview period</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value as FinancePeriod)} className="h-10 appearance-none rounded-ui-sm border border-[#d5c8f3] bg-white pl-3 pr-8 text-xs font-bold text-[var(--brand)] shadow-ui-xs outline-none focus-visible:shadow-ui-focus-strong sm:min-w-36">
              {Object.entries(periodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden />
          </label>
        </div>

        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.45fr)] lg:items-end">
          <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(72px,0.75fr)] divide-x divide-[var(--line)] rounded-ui-md border border-[var(--line-soft)] bg-white/75 p-4">
          <div className="min-w-0 pr-3">
            <p className="text-xs font-semibold text-[var(--text-muted)]">Total Expenses</p>
            <p className="mt-1 whitespace-nowrap text-[clamp(20px,6vw,30px)] font-bold leading-[1.1] tabular-nums text-[var(--danger)]">-{money(summary.total)}</p>
            <div className="mt-2 flex flex-col items-start gap-1 text-[11px] text-[var(--text-muted)] sm:flex-row sm:items-center sm:gap-2"><ChangeBadge value={summary.amountChangePercent} /><span>vs previous</span></div>
          </div>
          <div className="min-w-0 pl-3">
            <p className="text-xs font-semibold text-[var(--text-muted)]">Transactions</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-[var(--text-primary)] sm:text-2xl">{summary.current.length}</p>
            <div className="mt-2 flex flex-col items-start gap-1 text-[11px] text-[var(--text-muted)] sm:flex-row sm:items-center sm:gap-2"><ChangeBadge value={summary.transactionChangePercent} /><span>vs previous</span></div>
          </div>
          </div>

        <div className="h-[156px] min-w-0 rounded-ui-md border border-[var(--line-soft)] bg-white/75 px-1 pb-1 pt-2 sm:h-40">
          {trend.length >= 1 ? (
            <ExpenseTrendChart data={trend} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-ui-md border border-dashed border-[var(--line)] px-4 text-center text-xs text-[var(--text-muted)]">
              No expenses recorded for this period.
            </div>
          )}
        </div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <PeriodCard label="Today" amount={periodTotals.today} icon={<ArrowDown className="h-4 w-4" />} tone="bg-[var(--danger-soft)] text-[var(--danger)]" />
        <PeriodCard label="This Week" amount={periodTotals.week} icon={<CalendarDays className="h-4 w-4" />} tone="bg-[var(--brand-soft)] text-[var(--brand)]" />
        <PeriodCard label="This Month" amount={periodTotals.month} icon={<WalletCards className="h-4 w-4" />} tone="bg-[var(--success-soft)] text-[var(--success)]" />
      </div>

      <section className="rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-4 shadow-ui-xs sm:p-6 lg:p-7">
        <div className="sm:flex sm:items-end sm:justify-between sm:gap-6">
        <div><h2 className="text-lg font-bold text-[var(--text-primary)] sm:text-xl">Expense Ledger</h2><p className="mt-1 hidden text-sm text-[var(--text-muted)] sm:block">Search and review recorded business expenses.</p></div>
        <div className="mt-4 flex gap-2 sm:mt-0 sm:w-full sm:max-w-xl">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search expenses</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden />
            <input type="search" value={filters.query} onChange={(event) => { setFilters((current) => ({ ...current, query: event.target.value })); setShowAll(false); }} placeholder="Search expenses…" className="h-11 w-full rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)] pl-9 pr-3 text-sm outline-none focus-visible:shadow-ui-focus-strong" />
          </label>
          <Button variant="outline" className={cx('relative h-11 shrink-0 px-3', activeFilterCount > 0 && 'border-[var(--brand)] text-[var(--brand)]')} onClick={() => setFilterOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" /> Filter
            {activeFilterCount > 0 ? <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--brand)] px-1 text-[10px] text-white">{activeFilterCount}</span> : null}
          </Button>
        </div>
        </div>

        <div className="mt-4 grid gap-2.5 lg:grid-cols-2 lg:gap-3">
          {visibleExpenses.map((expense) => (
            <article
              key={expense.id}
              role="button"
              tabIndex={0}
              aria-label={`View expense details for ${expense.description}`}
              onClick={() => setSelectedExpense(expense)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedExpense(expense);
                }
              }}
              className="grid min-h-[82px] min-w-0 cursor-pointer grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] p-3 transition-colors hover:bg-[var(--bg-soft)] focus-visible:outline-none focus-visible:shadow-ui-focus-strong"
            >
              <ExpenseIcon transaction={expense} />
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-[var(--text-primary)]">{expense.description}</h3>
                <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">{new Date(expense.date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })} · {new Date(expense.date).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' })}</p>
                <p className="text-[11px] leading-4 text-[var(--text-muted)]">{expense.category || 'Expense'}</p>
              </div>
              <div className="flex h-full shrink-0 flex-col items-end justify-between text-right">
                <p className="whitespace-nowrap text-sm font-bold tabular-nums text-[var(--danger)]">-{money(expense.amount)}</p>
                {canDelete && !(getExpenseSource(expense) === 'commission' && expense.parentSaleId) ? (
                  <button type="button" onClick={(event) => { event.stopPropagation(); requestDelete(expense); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-ui-sm text-[var(--text-muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]" aria-label={`Delete ${expense.description}`}><Trash2 className="h-4 w-4" /></button>
                ) : <span className="text-lg text-[var(--text-muted)]" aria-hidden>›</span>}
              </div>
            </article>
          ))}
        </div>

        {expenses.length === 0 ? (
          <div className="py-10 text-center"><ReceiptText className="mx-auto h-8 w-8 text-[var(--text-muted)]" /><h3 className="mt-3 font-bold">No expenses recorded</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">Record your first expense to start tracking cashflow.</p><Button className="mt-4" onClick={onRecordExpense}>Record Expense</Button></div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center"><h3 className="font-bold">No matching expenses</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">Try another search or clear the current filters.</p><Button variant="outline" className="mt-4" onClick={clearFilters}>Clear filters</Button></div>
        ) : null}

        {filtered.length > 6 ? <button type="button" onClick={() => setShowAll((value) => !value)} className="mt-5 flex min-h-11 w-full items-center justify-center text-sm font-bold text-[var(--brand)]">{showAll ? 'Show fewer expenses' : 'View All Expenses →'}</button> : null}
      </section>

      <AppSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter expenses" description="Narrow the ledger without changing your saved records." footer={<ModalFooterActions><Button variant="secondary" onClick={clearFilters}>Clear</Button><Button onClick={() => setFilterOpen(false)}>Show {filtered.length}</Button></ModalFooterActions>}>
        <div className="space-y-4">
          <Field id="finance-filter-category" label="Category"><select id="finance-filter-category" className={fieldControlClassName} value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field>
          <Field id="finance-filter-source" label="Expense source"><select id="finance-filter-source" className={fieldControlClassName} value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value as ExpenseLedgerFilters['source'] }))}><option value="all">All sources</option><option value="commission">Commission</option><option value="inventory">Inventory / product</option><option value="staff">Staff</option><option value="general">General expense</option></select></Field>
          <div className="grid grid-cols-2 gap-3"><Field id="finance-filter-start" label="From"><input id="finance-filter-start" type="date" className={fieldControlClassName} value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} /></Field><Field id="finance-filter-end" label="To"><input id="finance-filter-end" type="date" className={fieldControlClassName} value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} /></Field></div>
          <div className="grid grid-cols-2 gap-3"><Field id="finance-filter-min" label="Minimum RM"><input id="finance-filter-min" type="number" min="0" step="0.01" className={fieldControlClassName} value={filters.minimumAmount} onChange={(event) => setFilters((current) => ({ ...current, minimumAmount: event.target.value }))} /></Field><Field id="finance-filter-max" label="Maximum RM"><input id="finance-filter-max" type="number" min="0" step="0.01" className={fieldControlClassName} value={filters.maximumAmount} onChange={(event) => setFilters((current) => ({ ...current, maximumAmount: event.target.value }))} /></Field></div>
        </div>
      </AppSheet>

      <ExpenseDetailsSheet
        expense={selectedExpense}
        canDelete={canDelete}
        onClose={() => setSelectedExpense(null)}
        onRequestDelete={requestDelete}
      />

      <ConfirmationDialog
        open={Boolean(deletingExpense)}
        onClose={() => { if (!deleteBusy) setDeletingExpense(null); }}
        onConfirm={confirmDelete}
        title="Delete expense?"
        confirmLabel="Delete Expense"
        tone="danger"
        busy={deleteBusy}
        description={deletingExpense ? (
          <div>
            <p className="font-semibold text-[var(--text-primary)]">{deletingExpense.description}</p>
            <p className="mt-1 whitespace-nowrap font-bold tabular-nums text-[var(--danger)]">-{money(deletingExpense.amount)}</p>
            <p className="mt-3">This action cannot be undone.</p>
          </div>
        ) : undefined}
      />
    </div>
  );
};

export default MobileFinanceOverview;
