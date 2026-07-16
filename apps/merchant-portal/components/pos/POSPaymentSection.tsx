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
  <div className={cx('space-y-2 mb-2', className)}>
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">
          Sale Date &amp; Time
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
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
            className="flex-1 min-h-[38px] py-1.5 px-2 bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-md text-xs outline-none focus-visible:shadow-ui-focus-strong box-border"
          />
          <input
            type="time"
            value={customTime}
            onChange={(e) => onCustomTimeChange(e.target.value)}
            className="w-24 min-h-[38px] py-1.5 px-2 bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-md text-xs outline-none focus-visible:shadow-ui-focus-strong box-border"
          />
        </div>
      ) : (
        <p className="text-[11px] text-[var(--text-secondary)] tabular-nums">{currentDateTimeLabel}</p>
      )}
    </div>

    <div className="space-y-1">
      <label className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">
        Payment Method
      </label>
      <select
        className="w-full min-h-[38px] py-1.5 px-2 bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-md outline-none focus-visible:shadow-ui-focus-strong text-sm font-bold box-border"
        value={paymentMethod}
        onChange={(e) => onPaymentMethodChange(e.target.value)}
        disabled={paymentDisabled}
      >
        {paymentMethods.map((method) => (
          <option key={method} value={method}>
            {method}
          </option>
        ))}
      </select>
      {paymentHint}
    </div>
  </div>
);

export default POSPaymentSection;
