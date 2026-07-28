import React from 'react';
import { cx } from './cx';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

export interface StatusBadgeProps {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}

const toneClass: Record<StatusTone, string> = {
  neutral: 'bg-[var(--bg-soft)] text-[var(--text-secondary)] border-[var(--line)]',
  success: 'bg-[var(--success-soft)] text-[var(--success)] border-transparent',
  warning: 'bg-[var(--warning-soft)] text-[var(--warning)] border-transparent',
  danger: 'bg-[var(--danger-soft)] text-[var(--danger)] border-transparent',
  info: 'bg-[var(--info-soft)] text-[var(--info)] border-transparent',
  brand: 'bg-[var(--brand-soft)] text-[var(--brand-deep)] border-transparent',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  children,
  tone = 'neutral',
  className,
}) => (
  <span
    className={cx(
      'm-status-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full border',
      'text-[11px] font-semibold capitalize tracking-normal whitespace-nowrap',
      toneClass[tone],
      className,
    )}
  >
    {children}
  </span>
);

export default StatusBadge;
