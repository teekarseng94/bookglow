import React from 'react';
import { cx } from '../ui/cx';

export interface POSMemberSummaryProps {
  quickPOSMemberName?: string | null;
  creditLabel?: string | null;
  children: React.ReactNode;
  className?: string;
}

/** Member / customer context — selecting a customer must not clear cart (parent owns cart). */
export const POSMemberSummary: React.FC<POSMemberSummaryProps> = ({
  quickPOSMemberName,
  creditLabel,
  children,
  className,
}) => (
  <div className={cx('space-y-2 pb-1', className)}>
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
    <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">Customer</label>
    {children}
  </div>
);

export default POSMemberSummary;
