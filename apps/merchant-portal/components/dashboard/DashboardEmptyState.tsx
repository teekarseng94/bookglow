import React from 'react';
import { cx } from '../ui/cx';

export interface DashboardEmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  compact,
  className,
}) => (
  <div
    className={cx(
      'text-center',
      compact ? 'py-6 px-4' : 'bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] p-6',
      className,
    )}
  >
    {icon ? (
      <div className="w-12 h-12 bg-[var(--bg-soft)] rounded-full flex items-center justify-center mx-auto mb-3 text-[var(--text-muted)]">
        {icon}
      </div>
    ) : null}
    <p className="text-sm font-semibold text-[var(--text-muted)]">{title}</p>
    {description ? <p className="text-xs text-[var(--text-muted)] mt-1">{description}</p> : null}
    {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
  </div>
);

export default DashboardEmptyState;
