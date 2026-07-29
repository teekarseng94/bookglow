import React from 'react';
import { cx } from '../ui/cx';

export interface MemberSummaryProps {
  name: string;
  phone?: string;
  joinDateLabel?: string;
  avatarInitial?: string;
  actions?: React.ReactNode;
  className?: string;
}

/** Compact identity + contact block for Member Details. */
export const MemberSummary: React.FC<MemberSummaryProps> = ({
  name,
  phone,
  joinDateLabel,
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
    <div className="m-member-summary__avatar rounded-full bg-[var(--brand-soft)] text-[var(--brand-deep)] flex items-center justify-center font-bold border-2 border-white shadow-sm shrink-0 w-11 h-11 text-base sm:w-16 sm:h-16 sm:text-2xl">
      {avatarInitial || (name || '?').charAt(0)}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="m-member-summary__name text-[var(--text-primary)] truncate text-[15px] sm:text-lg font-semibold sm:font-bold">
        {name}
      </h3>
      <p className="m-member-summary__meta text-[var(--text-secondary)] truncate text-[13px] sm:text-sm">
        {phone || '—'}
      </p>
      {joinDateLabel ? (
        <p className="m-member-summary__join text-[var(--text-muted)] mt-0.5 text-[11px] sm:hidden">
          Joined {joinDateLabel}
        </p>
      ) : null}
    </div>
    {joinDateLabel ? (
      <div className="text-right shrink-0 hidden sm:block">
        <span className="m-caption text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
          Join Date
        </span>
        <p className="m-member-summary__meta text-sm font-semibold text-[var(--text-primary)]">
          {joinDateLabel}
        </p>
      </div>
    ) : null}
    {actions}
  </div>
);

export default MemberSummary;
