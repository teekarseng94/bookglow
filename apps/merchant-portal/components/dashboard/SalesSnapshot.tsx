import React from 'react';
import { cx } from '../ui/cx';
import { DashboardEmptyState } from './DashboardEmptyState';

export interface SalesSnapshotRow {
  id: string;
  title: string;
  meta?: string;
  amountLabel: string;
}

export interface SalesSnapshotCategory {
  id: string;
  label: string;
  valueLabel: string;
  icon?: React.ReactNode;
}

export interface SalesSnapshotProps {
  title?: string;
  categories: SalesSnapshotCategory[];
  recentTitle?: string;
  recentRows: SalesSnapshotRow[];
  className?: string;
}

export const SalesSnapshot: React.FC<SalesSnapshotProps> = ({
  title = 'Sales snapshot',
  categories,
  recentTitle = 'Recent sales',
  recentRows,
  className,
}) => (
  <section className={cx('space-y-3', className)}>
    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{title}</h3>
    <div className="bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs p-4">
      <div className="space-y-2">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between py-2 px-3 rounded-ui-sm bg-[var(--bg-soft)] border border-[var(--line)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              {cat.icon}
              <span className="text-sm font-medium text-[var(--text-secondary)] truncate">{cat.label}</span>
            </div>
            <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums shrink-0 ml-2">
              {cat.valueLabel}
            </span>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--line)]">
        <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">{recentTitle}</h4>
      </div>
      {recentRows.length === 0 ? (
        <DashboardEmptyState title="No sales recorded yet." compact />
      ) : (
        <div className="divide-y divide-[var(--line)]">
          {recentRows.map((row) => (
            <div key={row.id} className="p-4 flex justify-between items-center gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{row.title}</p>
                {row.meta ? (
                  <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase">{row.meta}</p>
                ) : null}
              </div>
              <span className="text-sm font-bold text-emerald-600 tabular-nums shrink-0">{row.amountLabel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </section>
);

export default SalesSnapshot;
