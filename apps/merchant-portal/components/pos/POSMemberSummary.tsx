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
  <div className={cx('space-y-2', className)}>
    {quickPOSMemberName ? (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-ui-sm bg-[var(--brand-soft)] border border-[var(--brand)]/30">
        <span className="text-[11px] font-semibold text-[var(--brand-deep)]">
          Customer: {quickPOSMemberName} selected.
        </span>
      </div>
    ) : null}
    {creditLabel ? (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-ui-sm bg-blue-50 border border-blue-200">
        <span className="text-[11px] font-semibold text-blue-700">{creditLabel}</span>
      </div>
    ) : null}
    <div className="flex items-center justify-between gap-2">
      <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
        Customer
      </label>
      {onNewCustomer ? (
        <button
          type="button"
          onClick={onNewCustomer}
          className="text-xs font-semibold text-[var(--brand)] hover:underline"
        >
          + New Customer
        </button>
      ) : null}
    </div>
    {children}
  </div>
);

export default POSMemberSummary;
