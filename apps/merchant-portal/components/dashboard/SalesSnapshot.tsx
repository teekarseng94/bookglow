import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { cx } from '../ui/cx';
import { DashboardEmptyState } from './DashboardEmptyState';

export interface SalesSnapshotCategory {
  id: string;
  label: string;
  valueLabel: string;
  icon?: React.ReactNode;
}

export interface SalesSnapshotPeriodOption {
  id: string;
  label: string;
}

export interface SalesSnapshotChartPoint {
  label: string;
  value: number;
}

export interface SalesSnapshotProps {
  title?: string;
  periodOptions: SalesSnapshotPeriodOption[];
  selectedPeriod: string;
  onPeriodChange: (id: string) => void;
  totalLabel: string;
  /** Only rendered when a real previous-period comparison exists — never fabricated. */
  trendLabel?: string;
  trendPositive?: boolean;
  chartData: SalesSnapshotChartPoint[];
  categories: SalesSnapshotCategory[];
  onViewHistory?: () => void;
  className?: string;
}

export const SalesSnapshot: React.FC<SalesSnapshotProps> = ({
  title = 'Sales Snapshot',
  periodOptions,
  selectedPeriod,
  onPeriodChange,
  totalLabel,
  trendLabel,
  trendPositive,
  chartData,
  categories,
  onViewHistory,
  className,
}) => {
  const hasChartData = chartData.some((p) => p.value > 0);
  return (
    <section className={cx('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{title}</h3>
        <label className="sr-only" htmlFor="sales-snapshot-period">
          Period
        </label>
        <select
          id="sales-snapshot-period"
          value={selectedPeriod}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="h-8 px-2 rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-secondary)]"
        >
          {periodOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs p-4 space-y-4">
        <div>
          <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums leading-tight">{totalLabel}</p>
          {trendLabel ? (
            <p className={cx('text-xs font-semibold mt-0.5', trendPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>
              {trendLabel}
            </p>
          ) : null}
        </div>

        <div className="h-16">
          {hasChartData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="salesSnapshotFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} fill="url(#salesSnapshotFill)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
              No sales data for this period yet.
            </div>
          )}
        </div>

        <div className="space-y-2 pt-1 border-t border-[var(--line)]">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {cat.icon}
                <span className="text-sm text-[var(--text-secondary)] truncate">{cat.label}</span>
              </div>
              <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums shrink-0">{cat.valueLabel}</span>
            </div>
          ))}
          {categories.length === 0 && <DashboardEmptyState title="No sales recorded yet." compact />}
        </div>

        {onViewHistory ? (
          <button
            type="button"
            onClick={onViewHistory}
            className="w-full py-2 rounded-ui-sm bg-[var(--bg-soft)] border border-[var(--line)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-selection)] transition-colors"
          >
            View sales history
          </button>
        ) : null}
      </div>
    </section>
  );
};

export default SalesSnapshot;
