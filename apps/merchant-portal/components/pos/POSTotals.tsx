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
  <div className={cx('space-y-3', className)}>
    {subtotalLabel ? (
      <div className="flex justify-between text-sm text-[var(--text-secondary)]">
        <span>Subtotal</span>
        <span className="tabular-nums font-semibold text-emerald-600">{subtotalLabel}</span>
      </div>
    ) : null}
    <div className="flex justify-between items-baseline text-[var(--text-primary)]">
      <span className="text-base font-bold">Total</span>
      <span className="text-xl font-black tabular-nums text-[var(--brand)]">{totalLabel}</span>
    </div>
    {warning}
    <button
      type="button"
      disabled={checkoutDisabled || isProcessing}
      onClick={onCheckout}
      className={cx(
        'w-full py-3 px-4 rounded-ui-md font-semibold shadow-ui-xs transition-all',
        'flex items-center justify-between gap-3 min-h-[48px] text-sm',
        checkoutDisabled
          ? 'bg-[var(--bg-soft)] text-[var(--text-muted)] cursor-not-allowed'
          : isProcessing
            ? 'bg-[var(--brand)]/70 text-white cursor-wait'
            : hasRedemptions
              ? 'bg-amber-400 text-slate-900 hover:bg-amber-500 active:scale-[0.99]'
              : 'bg-[var(--brand)] text-white hover:opacity-90 active:scale-[0.99]',
      )}
    >
      <span>{isProcessing ? 'Finalizing...' : checkoutLabel}</span>
      {!isProcessing ? <span className="tabular-nums font-bold">{totalLabel}</span> : null}
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
