import React from 'react';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';

export interface POSTotalsProps {
  totalLabel: string;
  warning?: React.ReactNode;
  checkoutLabel: string;
  onCheckout: () => void;
  checkoutDisabled?: boolean;
  isProcessing?: boolean;
  hasRedemptions?: boolean;
  className?: string;
}

/** Single dominant checkout action — uses existing isProcessing only. */
export const POSTotals: React.FC<POSTotalsProps> = ({
  totalLabel,
  warning,
  checkoutLabel,
  onCheckout,
  checkoutDisabled,
  isProcessing,
  hasRedemptions,
  className,
}) => (
  <div className={cx('space-y-2', className)}>
    <div className="flex justify-between text-base font-black text-[var(--text-primary)] pt-1">
      <span>Total</span>
      <span className="tabular-nums">{totalLabel}</span>
    </div>
    {warning}
    <button
      type="button"
      disabled={checkoutDisabled || isProcessing}
      onClick={onCheckout}
      className={cx(
        'w-full py-2 rounded-ui-md font-semibold shadow-ui-xs transition-all flex items-center justify-center gap-2 min-h-[44px] text-sm',
        checkoutDisabled
          ? 'bg-[var(--bg-soft)] text-[var(--text-muted)] cursor-not-allowed'
          : isProcessing
            ? 'bg-[var(--brand)]/70 text-white cursor-wait'
            : hasRedemptions
              ? 'bg-amber-400 text-slate-900 hover:bg-amber-500 active:scale-95'
              : 'bg-[var(--brand)] text-white hover:opacity-90 active:scale-95',
      )}
    >
      {isProcessing ? 'Finalizing...' : checkoutLabel}
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
