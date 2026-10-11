import React from 'react';
import { StatusBadge, type StatusTone } from '../ui/StatusBadge';
import { cx } from '../ui/cx';

export interface ScheduleBookingCardProps {
  timeLabel: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  status: string;
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
  onClick,
  className,
}) => (
  <button
    type="button"
    onClick={onClick}
    style={{ borderLeftColor: 'var(--brand)' }}
    className={cx(
      'm-list-row m-appointment-row m-card-interactive w-full text-left border border-[var(--line)] border-l-4',
      'bg-[var(--brand-soft)]',
      'm-booking-card',
      'md:rounded-ui-sm md:px-3 md:py-2.5 md:min-h-0',
      'transition-transform',
      className,
    )}
  >
    <div className="flex items-center justify-between gap-2 min-w-0">
      <span className="m-booking-time md:text-sm md:font-semibold text-[var(--text-primary)] truncate">
        {timeLabel}
      </span>
      <StatusBadge tone={statusTone(status)}>{status}</StatusBadge>
    </div>
    <p className="mt-0.5 min-w-0 truncate">
      <span className="m-booking-name md:text-sm md:font-semibold text-[var(--text-primary)]">
        {customerName}
      </span>
      <span aria-hidden> · </span>
      <span className="m-secondary md:text-sm text-[var(--text-secondary)]">{serviceName}</span>
      <span aria-hidden> · </span>
      <span className="m-caption md:text-xs text-[var(--text-muted)]">{staffName}</span>
    </p>
  </button>
);

export default ScheduleBookingCard;
