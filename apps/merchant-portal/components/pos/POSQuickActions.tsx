import React from 'react';
import { cx } from '../ui/cx';

export interface POSQuickActionsProps {
  onWalkInCustomer?: () => void;
  onClearCart?: () => void;
  clearDisabled?: boolean;
  className?: string;
}

/**
 * Desktop catalogue footer — only actions backed by existing POS handlers.
 */
export const POSQuickActions: React.FC<POSQuickActionsProps> = ({
  onWalkInCustomer,
  onClearCart,
  clearDisabled,
  className,
}) => {
  if (!onWalkInCustomer && !onClearCart) return null;

  return (
    <div
      className={cx(
        'hidden posd:flex shrink-0 items-center gap-5 border-t border-[var(--line)] bg-[var(--bg-surface)]/90 px-1 py-2.5 text-[13px] font-semibold',
        className,
      )}
    >
      {onWalkInCustomer ? (
        <button
          type="button"
          onClick={onWalkInCustomer}
          className="text-[var(--text-secondary)] transition-colors hover:text-[var(--brand)]"
        >
          Walk-in Customer
        </button>
      ) : null}
      {onClearCart ? (
        <button
          type="button"
          onClick={onClearCart}
          disabled={clearDisabled}
          className="text-[var(--danger)] transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-40"
        >
          Clear Cart
        </button>
      ) : null}
    </div>
  );
};

export default POSQuickActions;
