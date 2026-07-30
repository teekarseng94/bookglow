import React from 'react';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';

export interface POSTotalsProps {
  totalLabel: string;
  subtotalLabel?: string;
  warning?: React.ReactNode;
  checkoutLabel: string;
  onCheckout: () => void;
  checkoutDisabled?: boolean;
  isProcessing?: boolean;
  hasRedemptions?: boolean;
  className?: string;
}

/** Sticky checkout block — total + Complete Sale CTA. */
export const POSTotals: React.FC<POSTotalsProps> = ({
  totalLabel,
  subtotalLabel,
  warning,
  checkoutLabel,
  onCheckout,
  checkoutDisabled,
  isProcessing,
  hasRedemptions,
  className,
}) => (
  <div className={cx('space-y-2 lg:space-y-3', className)}>
    {subtotalLabel ? (
      <div className="flex justify-between text-xs lg:text-sm text-[var(--text-secondary)]">
        <span>Subtotal</span>
        <span className="tabular-nums font-medium text-[var(--text-primary)]">{subtotalLabel}</span>
      </div>
    ) : null}
    <div className="border-t border-[var(--line)]" />
    <div className="flex justify-between items-baseline text-[var(--text-primary)]">
      <span className="text-sm lg:text-base font-bold">Total</span>
      <span className="m-pos-totals-total text-lg lg:text-xl font-bold tabular-nums text-[var(--brand)]">
        {totalLabel}
      </span>
    </div>
    {warning}
    <button
      type="button"
      disabled={checkoutDisabled || isProcessing}
      onClick={onCheckout}
      className={cx(
        'm-pos-checkout-btn w-full py-2.5 lg:py-3 px-3.5 lg:px-4 rounded-ui-md font-semibold shadow-ui-xs transition-all',
        'flex items-center justify-between gap-2 min-h-[44px] lg:min-h-[48px] text-sm',
        checkoutDisabled
          ? 'bg-[var(--bg-soft)] text-[var(--text-muted)] cursor-not-allowed'
          : isProcessing
            ? 'bg-[var(--brand)]/70 text-white cursor-wait'
            : hasRedemptions
              ? 'bg-[var(--warning)] text-white hover:opacity-90 active:scale-[0.99]'
              : 'bg-gradient-to-r from-[var(--brand)] to-[var(--brand-deep,var(--brand))] text-white hover:opacity-95 active:scale-[0.99]',
      )}
    >
      <span className="inline-flex items-center gap-2 min-w-0">
        {!isProcessing ? (
          <svg className="w-4 h-4 shrink-0 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        ) : null}
        <span className="truncate">{isProcessing ? 'Finalizing...' : checkoutLabel}</span>
      </span>
      {!isProcessing ? <span className="tabular-nums font-bold shrink-0">{totalLabel}</span> : null}
    </button>
  </div>
);

export interface POSSaleCompleteActionsProps {
  onPrint: () => void;
  onNewSale: () => void;
  className?: string;
}

export const POSSaleCompleteActions: React.FC<POSSaleCompleteActionsProps> = ({
  onPrint,
  onNewSale,
  className,
}) => (
  <div className={cx('space-y-3 animate-fadeIn', className)}>
    <Button type="button" variant="secondary" className="w-full" onClick={onPrint}>
      Print Receipt
    </Button>
    <Button type="button" variant="secondary" className="w-full" onClick={onPrint}>
      Save PDF
    </Button>
    <Button type="button" variant="primary" className="w-full" onClick={onNewSale}>
      Done
    </Button>
  </div>
);

export default POSTotals;
