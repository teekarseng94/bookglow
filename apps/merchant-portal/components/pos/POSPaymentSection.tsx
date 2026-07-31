import React from 'react';
import { cx } from '../ui/cx';

export interface POSPaymentSectionProps {
  useCustomDateTime: boolean;
  onCustomDateTimeChange: (checked: boolean) => void;
  customDate: string;
  onCustomDateChange: (value: string) => void;
  customTime: string;
  onCustomTimeChange: (value: string) => void;
  currentDateTimeLabel: string;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  paymentMethods: string[];
  paymentDisabled?: boolean;
  paymentHint?: React.ReactNode;
  className?: string;
}

export const POSPaymentSection: React.FC<POSPaymentSectionProps> = ({
  useCustomDateTime,
  onCustomDateTimeChange,
  customDate,
  onCustomDateChange,
  customTime,
  onCustomTimeChange,
  currentDateTimeLabel,
  paymentMethod,
  onPaymentMethodChange,
  paymentMethods,
  paymentDisabled,
  paymentHint,
  className,
}) => (
  <div className={cx('space-y-2 posd:space-y-3', className)}>
    {/* Sale date & time */}
    <div className="space-y-1.5">
      {/* Phone + tablet: icon + label/value + Custom on one row */}
      <div className="flex min-w-0 items-center gap-2 posd:hidden">
        <svg className="w-4 h-4 text-[var(--brand)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="m-pos-label uppercase text-[var(--text-muted)] tracking-wider text-[10px]">
            Sale Date &amp; Time
          </p>
          {!useCustomDateTime ? (
            <p className="text-[11px] text-[var(--text-secondary)] tabular-nums truncate mt-0.5">
              {currentDateTimeLabel}
            </p>
          ) : null}
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] shrink-0">
          <input
            type="checkbox"
            checked={useCustomDateTime}
            onChange={(e) => onCustomDateTimeChange(e.target.checked)}
            className="rounded border-[var(--line)] text-[var(--brand)] focus:ring-[var(--brand)] w-3.5 h-3.5"
          />
          <span>Custom</span>
        </label>
      </div>

      {/* Desktop (1200+): previous stacked layout */}
      <div className="hidden items-center justify-between gap-2 posd:flex">
        <div>
          <p className="m-pos-label uppercase tracking-wider text-[var(--text-muted)]">Sale Date &amp; Time</p>
          {!useCustomDateTime ? (
            <p className="mt-0.5 text-xs tabular-nums text-[var(--text-secondary)]">{currentDateTimeLabel}</p>
          ) : null}
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={useCustomDateTime}
            onChange={(e) => onCustomDateTimeChange(e.target.checked)}
            className="rounded border-[var(--line)] text-[var(--brand)] focus:ring-[var(--brand)]"
          />
          <span>Custom</span>
        </label>
      </div>

      {useCustomDateTime ? (
        <div className="flex gap-2">
          <input
            type="date"
            value={customDate}
            onChange={(e) => onCustomDateChange(e.target.value)}
            className="m-pos-control box-border min-h-[36px] flex-1 rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-sm outline-none focus-visible:shadow-ui-focus-strong posd:min-h-[40px] posd:py-2"
          />
          <input
            type="time"
            value={customTime}
            onChange={(e) => onCustomTimeChange(e.target.value)}
            className="m-pos-control box-border h-auto w-28 min-h-[36px] rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-sm outline-none focus-visible:shadow-ui-focus-strong posd:min-h-[40px] posd:py-2"
          />
        </div>
      ) : null}
    </div>

    {/* Payment method */}
    <div className="space-y-1.5">
      {/* Phone + tablet: label + dropdown same row */}
      <div className="flex min-w-0 items-center gap-2 posd:hidden">
        <svg className="h-4 w-4 shrink-0 text-[var(--brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <label className="m-pos-label shrink-0 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          Payment Method
        </label>
        <select
          className="m-pos-payment-select ml-auto box-border h-8 min-h-[32px] w-auto max-w-[55%] rounded-md border border-[var(--line)] bg-[var(--bg-surface)] px-2 py-1 text-xs font-semibold outline-none focus-visible:shadow-ui-focus-strong"
          value={paymentMethod}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
          disabled={paymentDisabled}
          aria-label="Payment method"
        >
          {paymentMethods.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop (1200+): stacked label + full-width select */}
      <div className="hidden space-y-1.5 posd:block">
        <label className="m-pos-label uppercase tracking-wider text-[var(--text-muted)]">Payment Method</label>
        <select
          className="m-pos-control box-border w-full min-h-[40px] rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] px-2.5 py-2 text-sm font-semibold outline-none focus-visible:shadow-ui-focus-strong"
          value={paymentMethod}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
          disabled={paymentDisabled}
          aria-label="Payment method"
        >
          {paymentMethods.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
      </div>

      {paymentHint}
    </div>
  </div>
);

export default POSPaymentSection;
