import React from 'react';
import { cx } from '../ui/cx';

export interface CustomerActivityMetric {
  id: string;
  label: string;
  value: string;
  trendLabel?: string;
  trendPositive?: boolean;
}

export interface CustomerActivityProps {
  title?: string;
  metrics: CustomerActivityMetric[];
  className?: string;
}

export const CustomerActivity: React.FC<CustomerActivityProps> = ({
  title = 'Customer Activity',
  metrics,
  className,
}) => (
  <section className={cx('space-y-2 sm:space-y-3', className)}>
    <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{title}</h2>
    <div className="rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] p-3 shadow-ui-xs sm:p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 sm:divide-x sm:divide-y-0 divide-y divide-[var(--line)]">
        {metrics.map((m) => (
          <div key={m.id} className="min-w-0 px-0 py-2 first:pt-0 sm:px-4 sm:py-0 sm:first:pl-0 last:pb-0 sm:last:pr-0">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">{m.label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-[var(--text-primary)] [overflow-wrap:anywhere]">{m.value}</p>
            {m.trendLabel ? (
              <p className={cx('text-xs font-medium mt-0.5', m.trendPositive ? 'text-[var(--success)]' : 'text-[var(--text-muted)]')}>
                {m.trendLabel}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default CustomerActivity;
