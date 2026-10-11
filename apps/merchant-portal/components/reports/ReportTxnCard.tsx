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
      'm-txn-card m-list-row m-entity-row bg-[var(--bg-surface)] border border-[var(--line)] shadow-ui-xs',
      onClick && 'm-card-interactive cursor-pointer active:scale-[0.99] transition-transform',
      className,
    )}
    title={description}
  >
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="min-w-0">
        <p className={cx('m-txn-amount tabular-nums leading-tight', amountClass[amountTone])}>
          {amountLabel}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-[var(--text-primary)]">{customer}</p>
      </div>
      <StatusBadge tone={statusTone} className="shrink-0">
        {statusLabel}
      </StatusBadge>
    </div>
    <p className="m-txn-meta mt-0.5 truncate">
      {dateTimeLabel}
      <span aria-hidden> · </span>
      {paymentMethod || '—'}
      {description ? (
        <>
          <span aria-hidden> · </span>
          {description}
        </>
      ) : null}
    </p>
  </div>
);

export default ReportTxnCard;
