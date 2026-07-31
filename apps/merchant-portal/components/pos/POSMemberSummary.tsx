import React from 'react';
import { cx } from '../ui/cx';

export interface POSMemberSummaryProps {
  quickPOSMemberName?: string | null;
  creditLabel?: string | null;
  children: React.ReactNode;
  className?: string;
  onNewCustomer?: () => void;
}

/** Member / customer context — selecting a customer must not clear cart (parent owns cart). */
export const POSMemberSummary: React.FC<POSMemberSummaryProps> = ({
  quickPOSMemberName,
  creditLabel,
  children,
  className,
  onNewCustomer,
}) => (
  <div className={cx('space-y-1.5 posd:space-y-2', className)}>
    {quickPOSMemberName ? (
      <div className="flex items-center gap-2 rounded-ui-sm border border-[var(--brand)]/30 bg-[var(--brand-soft)] px-2.5 py-1.5">
        <span className="m-secondary text-xs font-semibold text-[var(--brand-deep)]">
          Customer: {quickPOSMemberName} selected.
        </span>
      </div>
    ) : null}
    {creditLabel ? (
      <div className="flex items-center gap-2 rounded-ui-sm border border-[var(--info)]/20 bg-[var(--info-soft)] px-2.5 py-1.5">
        <span className="m-secondary text-xs font-semibold text-[var(--info)]">{creditLabel}</span>
      </div>
    ) : null}
    <div className="flex items-center justify-between gap-2">
      <label className="m-pos-label text-[10px] uppercase tracking-wider text-[var(--text-muted)] posd:text-[inherit]">
        Customer
      </label>
      {onNewCustomer ? (
        <button
          type="button"
          onClick={onNewCustomer}
          className="text-[12px] font-semibold text-[var(--brand)] hover:underline posd:text-xs"
        >
          + New Customer
        </button>
      ) : null}
    </div>
    {children}
  </div>
);

export default POSMemberSummary;
