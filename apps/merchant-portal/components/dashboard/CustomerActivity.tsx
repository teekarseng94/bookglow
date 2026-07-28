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
  <section className={cx('space-y-3', className)}>
    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{title}</h3>
    <div className="bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y divide-[var(--line)] sm:divide-y-0 sm:divide-x">
        {metrics.map((m) => (
          <div key={m.id} className="px-0 sm:px-4 py-3 sm:py-0 first:pl-0 sm:first:pl-0">
            <p className="text-xs font-semibold text-[var(--text-muted)]">{m.label}</p>
            <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums mt-1">{m.value}</p>
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
