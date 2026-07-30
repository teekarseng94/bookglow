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
  <div className={cx('space-y-2 lg:space-y-3', className)}>
    {/* Sale date & time */}
    <div className="space-y-1.5">
      {/* Mobile: icon + label/value + Custom on one row */}
      <div className="flex items-center gap-2 min-w-0 lg:hidden">
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

      {/* Desktop: previous stacked layout */}
      <div className="hidden lg:flex items-center justify-between gap-2">
        <div>
          <p className="m-pos-label uppercase text-[var(--text-muted)] tracking-wider">Sale Date &amp; Time</p>
          {!useCustomDateTime ? (
            <p className="text-xs text-[var(--text-secondary)] tabular-nums mt-0.5">{currentDateTimeLabel}</p>
          ) : null}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] shrink-0">
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
            className="m-pos-control flex-1 min-h-[36px] lg:min-h-[40px] py-1.5 lg:py-2 px-2.5 bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-md text-sm outline-none focus-visible:shadow-ui-focus-strong box-border"
          />
          <input
            type="time"
            value={customTime}
            onChange={(e) => onCustomTimeChange(e.target.value)}
            className="m-pos-control w-28 min-h-[36px] lg:min-h-[40px] py-1.5 lg:py-2 px-2.5 bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-md text-sm outline-none focus-visible:shadow-ui-focus-strong box-border"
          />
        </div>
      ) : null}
    </div>

    {/* Payment method */}
    <div className="space-y-1.5">
      {/* Mobile: label + dropdown same row */}
      <div className="flex items-center gap-2 min-w-0 lg:hidden">
        <svg className="w-4 h-4 text-[var(--brand)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <label className="m-pos-label uppercase text-[var(--text-muted)] tracking-wider text-[10px] shrink-0">
          Payment Method
        </label>
        <select
          className="m-pos-payment-select ml-auto min-h-[32px] h-8 py-1 px-2 w-auto max-w-[55%] bg-[var(--bg-surface)] border border-[var(--line)] rounded-md outline-none focus-visible:shadow-ui-focus-strong text-xs font-semibold box-border"
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

      {/* Desktop: stacked label + full-width select */}
      <div className="hidden lg:block space-y-1.5">
        <label className="m-pos-label uppercase text-[var(--text-muted)] tracking-wider">Payment Method</label>
        <select
          className="m-pos-control w-full min-h-[40px] py-2 px-2.5 bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-md outline-none focus-visible:shadow-ui-focus-strong text-sm font-semibold box-border"
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
