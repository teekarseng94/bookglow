import React from 'react';
import { cx } from '../ui/cx';

export interface POSStickyCartActionProps {
  itemCount: number;
  totalLabel: string;
  onOpen: () => void;
  className?: string;
}

/** Mobile sticky cart summary — checkout opens the cart sheet; does not create a new lock. */
export const POSStickyCartAction: React.FC<POSStickyCartActionProps> = ({
  itemCount,
  totalLabel,
  onOpen,
  className,
}) => (
  <div
    className={cx(
      'm-pos-sticky-cart md:hidden fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-[45]',
      'bg-[var(--bg-surface)] shadow-[0_-4px_12px_rgba(15,23,42,0.12)]',
      className,
    )}
  >
    <button
      type="button"
      onClick={onOpen}
      className="m-pos-sticky-cart__btn w-full flex items-center justify-between"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="m-pos-sticky-cart__count inline-flex items-center justify-center bg-[var(--brand-soft)] text-[var(--brand-deep)] tabular-nums">
          {itemCount}
        </span>
        <span className="m-pos-sticky-cart__total text-[var(--text-primary)] tabular-nums truncate">
          {itemCount} item{itemCount === 1 ? '' : 's'} · {totalLabel}
        </span>
      </div>
      <span
        className={cx(
          'm-pos-sticky-cart__cta inline-flex items-center gap-1.5 transition-all shrink-0',
          itemCount > 0
            ? 'bg-[var(--brand)] text-white shadow-ui-sm active:scale-95'
            : 'bg-[var(--bg-soft)] text-[var(--text-muted)]',
        )}
      >
        {itemCount > 0 ? 'Review order' : 'No items'}
        {itemCount > 0 ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        ) : null}
      </span>
    </button>
  </div>
);

export default POSStickyCartAction;
