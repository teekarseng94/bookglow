import React from 'react';
import { StatusBadge, type StatusTone } from '../ui/StatusBadge';
import { cx } from '../ui/cx';

export interface ReportTxnCardProps {
  amountLabel: string;
  amountTone?: 'in' | 'out' | 'neutral';
  customer: string;
  dateTimeLabel: string;
  paymentMethod: string;
  statusLabel: string;
  statusTone?: StatusTone;
  description?: string;
  onClick?: () => void;
  className?: string;
}

const amountClass = {
  in: 'text-[var(--success)]',
  out: 'text-[var(--danger)]',
  neutral: 'text-[var(--text-primary)]',
} as const;

/**
 * Mobile transaction row — leads with amount, customer, date/time, payment, status.
 * Parent owns open/detail handlers.
 */
export const ReportTxnCard: React.FC<ReportTxnCardProps> = ({
  amountLabel,
  amountTone = 'neutral',
  customer,
  dateTimeLabel,
  paymentMethod,
  statusLabel,
  statusTone = 'neutral',
  description,
  onClick,
  className,
}) => (
  <div
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={
      onClick
        ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }
        : undefined
    }
    className={cx(
      'm-txn-card m-card m-entity-row !p-3 bg-[var(--bg-surface)] border border-[var(--line)] shadow-ui-xs',
      onClick && 'm-card-interactive cursor-pointer active:scale-[0.99] transition-transform',
      className,
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={cx('m-txn-amount tabular-nums leading-tight', amountClass[amountTone])}>
          {amountLabel}
        </p>
        <p className="text-sm font-bold text-[var(--text-primary)] mt-1 truncate">{customer}</p>
      </div>
      <StatusBadge tone={statusTone} className="shrink-0">
        {statusLabel}
      </StatusBadge>
    </div>
    <div className="m-txn-meta mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span>{dateTimeLabel}</span>
      <span aria-hidden>·</span>
      <span>{paymentMethod || '—'}</span>
    </div>
    {description ? (
      <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">{description}</p>
    ) : null}
  </div>
);

export default ReportTxnCard;
