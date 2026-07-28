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
      'md:hidden fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-[45]',
      'border-t border-[var(--line)] bg-[var(--bg-surface)] shadow-[0_-4px_12px_rgba(15,23,42,0.12)]',
      className,
    )}
  >
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center justify-between px-4 py-3 min-h-[60px]"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-8 h-8 bg-[var(--brand-soft)] text-[var(--brand-deep)] rounded-full text-sm font-black tabular-nums">
          {itemCount}
        </span>
        <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">{totalLabel}</span>
      </div>
      <span
        className={cx(
          'inline-flex items-center gap-1.5 px-5 py-2.5 rounded-ui-md text-sm font-bold transition-all',
          itemCount > 0
<<<<<<< HEAD
            ? 'bg-[var(--brand)] text-white shadow-lg shadow-teal-200 active:scale-95'
=======
            ? 'bg-[var(--brand)] text-white shadow-ui-sm active:scale-95'
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
            : 'bg-[var(--bg-soft)] text-[var(--text-muted)]',
        )}
      >
        {itemCount > 0 ? 'Checkout' : 'No items'}
        {itemCount > 0 ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : null}
      </span>
    </button>
  </div>
);

export default POSStickyCartAction;
