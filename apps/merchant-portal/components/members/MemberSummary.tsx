import React from 'react';
import { cx } from '../ui/cx';

export interface MemberSummaryProps {
  name: string;
  phone?: string;
  joinDateLabel?: string;
  /** Formatted last renewed date, or "—" / "Never" when never renewed. */
  lastRenewedLabel?: string;
  /** Optional amount under last renewed (e.g. RM20.00). */
  lastRenewalAmountLabel?: string;
  avatarInitial?: string;
  actions?: React.ReactNode;
  className?: string;
}

/** Compact identity + contact block for Member Details. */
export const MemberSummary: React.FC<MemberSummaryProps> = ({
  name,
  phone,
  joinDateLabel,
  lastRenewedLabel,
  lastRenewalAmountLabel,
  avatarInitial,
  actions,
  className,
}) => (
  <div
    className={cx(
      'm-member-summary bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs flex items-center',
      'p-3 sm:p-6 gap-3 sm:gap-4',
      className,
    )}
  >
    <div className="m-member-summary__avatar rounded-full bg-[var(--brand-soft)] text-[var(--brand-deep)] flex items-center justify-center font-bold border-2 border-white shadow-sm shrink-0 h-10 w-10 text-sm sm:h-16 sm:w-16 sm:text-2xl">
      {avatarInitial || (name || '?').charAt(0)}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="m-member-summary__name text-[var(--text-primary)] truncate text-[15px] sm:text-lg font-semibold sm:font-bold">
        {name}
      </h3>
      <p className="m-member-summary__meta text-[var(--text-secondary)] truncate text-[13px] sm:text-sm">
        {phone || '—'}
        {joinDateLabel ? <span className="sm:hidden">{` · Joined ${joinDateLabel}`}</span> : null}
        {lastRenewedLabel ? <span className="sm:hidden">{` · Renewed ${lastRenewedLabel}`}</span> : null}
        {lastRenewalAmountLabel ? <span className="sm:hidden">{` · ${lastRenewalAmountLabel}`}</span> : null}
      </p>
    </div>
    <div className="text-right shrink-0 hidden sm:flex sm:flex-col sm:items-end sm:gap-2">
      {joinDateLabel ? (
        <div>
          <span className="m-caption text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
            Join Date
          </span>
          <p className="m-member-summary__meta text-sm font-semibold text-[var(--text-primary)]">
            {joinDateLabel}
          </p>
        </div>
      ) : null}
      {lastRenewedLabel ? (
        <div>
          <span className="m-caption text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
            Last Renewed
          </span>
          <p className="m-member-summary__meta text-sm font-semibold text-[var(--text-primary)]">
            {lastRenewedLabel}
          </p>
          {lastRenewalAmountLabel ? (
            <p className="text-xs font-medium text-[var(--brand)] mt-0.5">{lastRenewalAmountLabel}</p>
          ) : null}
        </div>
      ) : null}
    </div>
    {actions}
  </div>
);

export default MemberSummary;
