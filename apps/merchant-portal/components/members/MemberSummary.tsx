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

/** Identity + contact block for Member Details. */
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
      'bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs p-4 sm:p-6 flex items-center gap-4',
      className,
    )}
  >
    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[var(--brand-soft)] text-[var(--brand-deep)] flex items-center justify-center text-xl sm:text-2xl font-bold border-2 border-white shadow-sm shrink-0">
      {avatarInitial || (name || '?').charAt(0)}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-lg font-bold text-[var(--text-primary)] truncate">{name}</h3>
      <p className="text-sm text-[var(--text-secondary)]">{phone || '—'}</p>
    </div>
    {joinDateLabel ? (
      <div className="text-right shrink-0">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Join Date</span>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{joinDateLabel}</p>
      </div>
    ) : null}
    {actions}
  </div>
);

export default MemberSummary;
