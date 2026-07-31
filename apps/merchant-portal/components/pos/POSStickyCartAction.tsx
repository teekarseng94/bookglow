import React from 'react';
import { cx } from '../ui/cx';

export interface POSStickyCartActionProps {
  itemCount: number;
  totalLabel: string;
  onOpen: () => void;
  className?: string;
}

/** Phone-only sticky cart — tablet/desktop use the persistent order rail. */
export const POSStickyCartAction: React.FC<POSStickyCartActionProps> = ({
  itemCount,
  totalLabel,
  onOpen,
  className,
}) => (
  <div
    className={cx(
      'm-pos-sticky-cart fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-[45] sm:hidden',
      'bg-[var(--bg-surface)] shadow-[0_-4px_12px_rgba(15,23,42,0.12)]',
      className,
    )}
  >
    <button
      type="button"
      onClick={onOpen}
      className="m-pos-sticky-cart__btn flex w-full items-center justify-between"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="m-pos-sticky-cart__count inline-flex items-center justify-center bg-[var(--brand-soft)] text-[var(--brand-deep)] tabular-nums">
          {itemCount}
        </span>
        <span className="m-pos-sticky-cart__total truncate tabular-nums text-[var(--text-primary)]">
          {itemCount} item{itemCount === 1 ? '' : 's'} · {totalLabel}
        </span>
      </div>
      <span
        className={cx(
          'm-pos-sticky-cart__cta inline-flex shrink-0 items-center gap-1.5 transition-all',
          itemCount > 0
            ? 'bg-[var(--brand)] text-white shadow-ui-sm active:scale-95'
            : 'bg-[var(--bg-soft)] text-[var(--text-muted)]',
        )}
      >
        {itemCount > 0 ? 'Review order' : 'No items'}
        {itemCount > 0 ? (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        ) : null}
      </span>
    </button>
  </div>
);

export default POSStickyCartAction;
