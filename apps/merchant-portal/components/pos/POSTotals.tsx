import React from 'react';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';

export interface POSTotalsProps {
  totalLabel: string;
  subtotalLabel?: string;
  /** Presentation-only discount line (defaults hidden when omitted). */
  discountLabel?: string;
  warning?: React.ReactNode;
  checkoutLabel: string;
  onCheckout: () => void;
  checkoutDisabled?: boolean;
  isProcessing?: boolean;
  hasRedemptions?: boolean;
  className?: string;
}

/** Sticky checkout block — total + checkout CTA. */
export const POSTotals: React.FC<POSTotalsProps> = ({
  totalLabel,
  subtotalLabel,
  discountLabel,
  warning,
  checkoutLabel,
  onCheckout,
  checkoutDisabled,
  isProcessing,
  hasRedemptions,
  className,
}) => (
  <div className={cx('space-y-2 posd:space-y-2.5', className)}>
    {subtotalLabel ? (
      <div className="flex justify-between text-xs text-[var(--text-secondary)] posd:text-sm">
        <span>Subtotal</span>
        <span className="font-medium tabular-nums text-[var(--text-primary)]">{subtotalLabel}</span>
      </div>
    ) : null}
    {discountLabel ? (
      <div className="flex justify-between text-xs text-[var(--text-secondary)] posd:text-sm">
        <span>Discount</span>
        <span className="font-medium tabular-nums text-[var(--text-primary)]">{discountLabel}</span>
      </div>
    ) : null}
    <div className="border-t border-[var(--line)]" />
    <div className="flex items-baseline justify-between text-[var(--text-primary)]">
      <span className="text-sm font-bold posd:text-[17px]">Total</span>
      <span className="m-pos-totals-total text-lg font-bold tabular-nums text-[var(--brand)] posd:text-[22px]">
        {totalLabel}
      </span>
    </div>
    {warning}
    <button
      type="button"
      disabled={checkoutDisabled || isProcessing}
      onClick={onCheckout}
      className={cx(
        'm-pos-checkout-btn w-full rounded-ui-md px-3.5 py-2.5 font-semibold shadow-ui-xs transition-all posd:px-4 posd:py-3.5',
        'flex min-h-[44px] items-center justify-center gap-2 text-sm posd:min-h-[52px] posd:text-[15px]',
        checkoutDisabled
          ? 'bg-[var(--bg-soft)] text-[var(--text-muted)] cursor-not-allowed'
          : isProcessing
            ? 'bg-[var(--brand)]/70 text-white cursor-wait'
            : hasRedemptions
              ? 'bg-[var(--warning)] text-white hover:opacity-90 active:scale-[0.99]'
              : 'bg-[var(--brand)] text-white hover:opacity-95 active:scale-[0.99]',
      )}
    >
      <span className="truncate">{isProcessing ? 'Finalizing...' : checkoutLabel}</span>
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
