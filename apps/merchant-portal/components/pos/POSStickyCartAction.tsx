import React from 'react';
import { cx } from '../ui/cx';

export interface POSStickyCartActionProps {
  itemCount: number;
  totalLabel: string;
  onOpen: () => void;
  className?: string;
}

/** Phone-only order summary; tablet/desktop use the persistent order rail. */
export const POSStickyCartAction: React.FC<POSStickyCartActionProps> = ({
  itemCount,
  totalLabel,
  onOpen,
  className,
}) => (
  <div
    className={cx(
      'm-pos-sticky-cart fixed bottom-[calc(var(--mobile-bottom-nav-height)+var(--mobile-safe-area-bottom))] left-0 right-0 z-[45] sm:hidden',
      'bg-[var(--bg-surface)] shadow-[0_-6px_24px_rgba(39,25,42,0.12)]',
      className,
    )}
  >
    <button
      type="button"
      onClick={onOpen}
      aria-label={itemCount > 0 ? `View order, ${itemCount} items, ${totalLabel}` : 'Open empty order'}
      className="m-pos-sticky-cart__btn flex w-full items-center gap-2.5"
    >
      <span className="m-pos-sticky-cart__count relative inline-flex shrink-0 items-center justify-center bg-[var(--brand-soft)] text-[var(--brand)]">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h2l2.2 10.2a2 2 0 002 1.6h7.9a2 2 0 001.9-1.4L21 8H7M10 20h.01M18 20h.01" />
        </svg>
        {itemCount > 0 ? <span className="m-pos-sticky-cart__badge">{itemCount}</span> : null}
      </span>
      <span className="min-w-0 text-left">
        <span className="m-pos-sticky-cart__items block truncate text-[var(--text-primary)]">
          {itemCount} item{itemCount === 1 ? '' : 's'}
        </span>
        <span className="m-pos-sticky-cart__label block">Total</span>
      </span>
      <span className="m-pos-sticky-cart__total ml-auto whitespace-nowrap tabular-nums text-[var(--brand)]">
        {totalLabel}
      </span>
      <span
        className={cx(
          'm-pos-sticky-cart__cta inline-flex shrink-0 items-center gap-1 transition-all',
          itemCount > 0
            ? 'bg-[var(--brand)] text-white shadow-ui-sm active:scale-95'
            : 'bg-[var(--bg-soft)] text-[var(--text-muted)]',
        )}
      >
        {itemCount > 0 ? 'View Order' : 'No items'}
        {itemCount > 0 ? (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        ) : null}
      </span>
    </button>
  </div>
);

export default POSStickyCartAction;
