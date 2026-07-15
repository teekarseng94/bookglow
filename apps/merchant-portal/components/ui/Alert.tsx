import React from 'react';
import { cx } from './cx';
import type { StatusTone } from './StatusBadge';

export interface AlertProps {
  tone?: Exclude<StatusTone, 'brand' | 'neutral'> | 'neutral' | 'info';
  title?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const toneClass = {
  neutral: 'bg-[var(--bg-soft)] border-[var(--line)] text-[var(--text-primary)]',
  success: 'bg-[var(--success-soft)] border-transparent text-[var(--success)]',
  warning: 'bg-[var(--warning-soft)] border-transparent text-[var(--warning)]',
  danger: 'bg-[var(--danger-soft)] border-transparent text-[var(--danger)]',
  info: 'bg-[var(--info-soft)] border-transparent text-[var(--info)]',
} as const;

export const Alert: React.FC<AlertProps> = ({
  tone = 'neutral',
  title,
  children,
  action,
  onDismiss,
  className,
}) => (
  <div
    role="status"
    className={cx(
      'flex gap-3 rounded-ui-md border px-3 py-3 text-sm',
      toneClass[tone],
      className,
    )}
  >
    <div className="min-w-0 flex-1 space-y-1">
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className="opacity-90">{children}</div>
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
    {onDismiss ? (
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-current opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        ×
      </button>
    ) : null}
  </div>
);

export default Alert;
