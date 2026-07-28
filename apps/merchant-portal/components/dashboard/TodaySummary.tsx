import React from 'react';
import { cx } from '../ui/cx';

export interface TodayMetric {
  id: string;
  label: string;
  value: string;
  toneClass?: string;
  emphasize?: boolean;
}

export interface TodaySummaryProps {
  heroLabel: string;
  heroValue: string;
  heroHint?: string;
  metrics: TodayMetric[];
  className?: string;
}

/** First-viewport summary — hero metric is dominant; secondary metrics stay compact. */
export const TodaySummary: React.FC<TodaySummaryProps> = ({
  heroLabel,
  heroValue,
  heroHint,
  metrics,
  className,
}) => (
  <div className={cx('space-y-3', className)}>
    <div className="bg-gradient-to-br from-[var(--brand)] to-[var(--brand-deep)] rounded-ui-lg p-5 text-white shadow-ui-sm">
      <p className="m-dash-hero-label text-white/80">{heroLabel}</p>
      <p className="m-dash-hero-value mt-1 tabular-nums">{heroValue}</p>
      {heroHint ? <p className="text-white/70 text-xs mt-1">{heroHint}</p> : null}
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
      {metrics.map((m) => (
        <div
          key={m.id}
          className={cx(
            'bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs',
            m.emphasize ? 'p-4 lg:p-5 col-span-2 lg:col-span-1' : 'p-3 lg:p-4',
          )}
        >
          <p className="m-dash-metric-label lg:text-xs mb-1">
            {m.label}
          </p>
          <p
            className={cx(
              'm-dash-metric-value font-bold tabular-nums',
              m.emphasize ? 'text-xl lg:text-2xl' : 'text-base lg:text-lg',
              m.toneClass || 'text-[var(--text-primary)]',
            )}
          >
            {m.value}
          </p>
        </div>
      ))}
    </div>
  </div>
);

export default TodaySummary;
