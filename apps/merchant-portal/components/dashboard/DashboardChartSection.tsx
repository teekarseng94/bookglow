import React from 'react';
import { BarChart3 } from 'lucide-react';
import { cx } from '../ui/cx';
import { DashboardEmptyState } from './DashboardEmptyState';
import { MoneyAmount } from './MoneyAmount';

export interface DashboardChartBar {
  day: string;
  sales: number;
  heightPct: number;
  isToday?: boolean;
  title?: string;
}

export interface DashboardChartSectionProps {
  title?: string;
  totalLabel: string;
  subtitle?: string;
  txnCountLabel?: string;
  bars: DashboardChartBar[];
  empty?: boolean;
  emptyTitle?: string;
  statsStrip?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/** Secondary weekly chart — sits below daily work. */
export const DashboardChartSection: React.FC<DashboardChartSectionProps> = ({
  title = 'This week',
  totalLabel,
  subtitle = 'Total Sales',
  txnCountLabel,
  bars,
  empty,
  emptyTitle = 'No sales data for this week yet.',
  statsStrip,
  children,
  className,
}) => (
  <section
    className={cx(
      'bg-[var(--bg-surface)] p-5 sm:p-6 rounded-ui-lg border border-[var(--line)] shadow-ui-xs',
      className,
    )}
  >
    <div className="flex justify-between items-center mb-1">
      <div className="flex min-w-0 items-center gap-2">
        <BarChart3 className="h-5 w-5 shrink-0 text-[var(--brand)]" aria-hidden />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{title}</h2>
      </div>
      {txnCountLabel ? (
        <span className="text-xs font-semibold text-[var(--text-muted)] tabular-nums">{txnCountLabel}</span>
      ) : null}
    </div>
    <p className="m-dash-hero-value mt-0.5">
      <MoneyAmount
        value={totalLabel}
        className="text-xl font-bold tracking-tight text-[var(--text-primary)]"
      />
    </p>
    <p className="m-dash-metric-label sm:text-xs mt-0.5">
      {subtitle}
    </p>

    {empty ? (
      <div className="mt-4 border-t border-[var(--line)] pt-4">
        <DashboardEmptyState icon={<BarChart3 className="w-6 h-6" />} title={emptyTitle} compact />
      </div>
    ) : (
      <>
        <div className="mt-4 flex h-28 items-end justify-between gap-1.5 sm:h-36 sm:gap-2" role="img" aria-label={`${title} sales by day`}>
          {bars.map((d) => (
            <div key={d.day} className="flex-1 min-w-0 h-full flex flex-col items-center gap-1.5">
              <div className="w-full flex-1 flex items-end">
                <div
                  className={cx(
                    'w-full rounded-t-md transition-all',
                    d.isToday ? 'bg-[var(--brand)]' : 'bg-[var(--info)]/40',
                  )}
                  style={{ height: `${d.heightPct}%` }}
                  title={d.title}
                />
              </div>
              <span
                className={cx(
                  'm-caption sm:text-xs',
                  d.isToday ? 'font-bold text-[var(--brand)]' : 'text-[var(--text-muted)]',
                )}
              >
                {d.day}
              </span>
            </div>
          ))}
        </div>
        {statsStrip}
      </>
    )}
    {children}
  </section>
);

export default DashboardChartSection;
