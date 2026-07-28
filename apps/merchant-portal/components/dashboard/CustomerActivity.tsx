import React from 'react';
import { cx } from '../ui/cx';
import { DashboardEmptyState } from './DashboardEmptyState';

export interface CustomerActivityRow {
  id: string;
  name: string;
  tier?: string;
  spentLabel: string;
}

export interface CustomerActivityProps {
  title?: string;
  totalCount: number;
  rows: CustomerActivityRow[];
  emptyMessage?: string;
  className?: string;
}

export const CustomerActivity: React.FC<CustomerActivityProps> = ({
  title = 'Customer activity',
  totalCount,
  rows,
  emptyMessage = 'No visitors this month.',
  className,
}) => (
  <section className={cx('space-y-3', className)}>
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{title}</h3>
      <span className="text-sm font-bold text-[var(--brand)] tabular-nums">{totalCount}</span>
    </div>
    <div className="bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs p-4">
      {rows.length === 0 ? (
        <DashboardEmptyState title={emptyMessage} compact />
      ) : (
        <div className="space-y-2">
          {rows.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between py-2 px-3 rounded-ui-sm bg-[var(--bg-soft)] border border-[var(--line)]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[var(--brand-soft)] text-[var(--brand-deep)] flex items-center justify-center text-xs font-bold shrink-0">
                  {v.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{v.name}</p>
                  {v.tier ? <p className="m-caption text-[var(--text-muted)]">{v.tier}</p> : null}
                </div>
              </div>
              <span className="text-sm font-bold text-[var(--brand)] tabular-nums shrink-0 ml-2">
                {v.spentLabel}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  </section>
);

export default CustomerActivity;
