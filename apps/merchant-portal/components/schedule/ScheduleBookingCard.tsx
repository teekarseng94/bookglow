import React from 'react';
import { StatusBadge, type StatusTone } from '../ui/StatusBadge';
import { cx } from '../ui/cx';

export interface ScheduleBookingCardProps {
  timeLabel: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  status: string;
  accentClassName?: string;
  onClick: () => void;
  className?: string;
}

const statusTone = (status: string): StatusTone => {
  if (status === 'completed') return 'success';
  if (status === 'cancelled' || status === 'no-show') return 'danger';
  if (status === 'scheduled') return 'warning';
  return 'neutral';
};

export const ScheduleBookingCard: React.FC<ScheduleBookingCardProps> = ({
  timeLabel,
  customerName,
  serviceName,
  staffName,
  status,
  accentClassName,
  onClick,
  className,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cx(
      'w-full text-left rounded-ui-sm border border-[var(--line)] border-l-4',
      'bg-[var(--bg-surface)] px-3 py-2.5 space-y-1',
      'active:scale-[0.99] transition-transform',
      accentClassName,
      className,
    )}
  >
    <div className="flex items-center justify-between gap-2 min-w-0">
      <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{timeLabel}</span>
      <StatusBadge tone={statusTone(status)}>{status}</StatusBadge>
    </div>
    <div className="flex items-baseline gap-1.5 min-w-0">
      <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{customerName}</span>
      <span className="text-sm text-[var(--text-secondary)] truncate">{serviceName}</span>
    </div>
    <p className="text-xs text-[var(--text-muted)] truncate">{staffName}</p>
  </button>
);

export default ScheduleBookingCard;
