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
  <div className={cx('space-y-2 posd:space-y-3', className)}>
    {subtotalLabel ? (
      <div className="flex justify-between text-xs text-[var(--text-secondary)] posd:text-sm">
        <span>Subtotal</span>
        <span className="font-medium tabular-nums text-[var(--text-primary)]">{subtotalLabel}</span>
      </div>
    ) : null}
    <div className="border-t border-[var(--line)]" />
    <div className="flex items-baseline justify-between text-[var(--text-primary)]">
      <span className="text-sm font-bold posd:text-base">Total</span>
      <span className="m-pos-totals-total text-lg font-bold tabular-nums text-[var(--brand)] posd:text-xl">
        {totalLabel}
      </span>
    </div>
    {warning}
    <button
      type="button"
      disabled={checkoutDisabled || isProcessing}
      onClick={onCheckout}
      className={cx(
        'm-pos-checkout-btn w-full rounded-ui-md px-3.5 py-2.5 font-semibold shadow-ui-xs transition-all posd:px-4 posd:py-3',
        'flex min-h-[44px] items-center justify-between gap-2 text-sm posd:min-h-[48px]',
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
