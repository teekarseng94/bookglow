import React from 'react';
import { cx } from '../ui/cx';

export interface POSMemberSummaryProps {
  quickPOSMemberName?: string | null;
  creditLabel?: string | null;
  children: React.ReactNode;
  className?: string;
  onNewCustomer?: () => void;
  /** Optional selected-customer card (name/phone) — presentation only. */
  selectedCustomer?: { name: string; phone?: string } | null;
}

/** Member / customer context — selecting a customer must not clear cart (parent owns cart). */
export const POSMemberSummary: React.FC<POSMemberSummaryProps> = ({
  quickPOSMemberName,
  creditLabel,
  children,
  className,
  onNewCustomer,
  selectedCustomer,
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
    {selectedCustomer ? (
      <div className="hidden items-center gap-2.5 rounded-ui-md border border-[var(--line)] bg-[var(--bg-soft)] px-2.5 py-2 posd:flex">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-sm font-bold text-[var(--brand)]">
          {(selectedCustomer.name || '?').trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{selectedCustomer.name}</p>
          {selectedCustomer.phone ? (
            <p className="truncate text-[12px] text-[var(--text-muted)]">{selectedCustomer.phone}</p>
          ) : null}
        </div>
      </div>
    ) : null}
  </div>
);

export default POSMemberSummary;
