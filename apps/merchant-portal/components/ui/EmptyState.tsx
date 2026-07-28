import React from 'react';
import { cx } from './cx';

export interface EmptyStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className,
}) => (
  <div
    className={cx(
      'm-empty-state flex flex-col items-center justify-center text-center gap-3',
      'px-6 py-10 rounded-ui-md border border-dashed border-[var(--line-strong)]',
      'bg-[var(--bg-soft)]',
      className,
    )}
  >
    {icon ? <div className="text-[var(--text-muted)]">{icon}</div> : null}
    <div className="space-y-1 max-w-md">
      <h3 className="m-empty-title text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      {description ? (
        <p className="m-empty-desc text-sm text-[var(--text-secondary)]">{description}</p>
      ) : null}
    </div>
    {action ? <div className="pt-1">{action}</div> : null}
  </div>
);

export default EmptyState;
