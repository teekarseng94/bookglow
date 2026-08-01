import React from 'react';
import { cx } from './cx';

export interface StickyActionBarProps {
  children: React.ReactNode;
  leading?: React.ReactNode;
  className?: string;
}

/**
 * Bottom sticky action region for mobile forms. Parent owns actions.
 */
export const StickyActionBar: React.FC<StickyActionBarProps> = ({
  children,
  leading,
  className,
}) => (
  <div
    className={cx(
      'm-sticky-bar sticky bottom-0 z-20',
      'flex items-center justify-between gap-3',
      'px-4 py-3 border-t border-[var(--line)]',
      'bg-[var(--bg-surface)]/95 backdrop-blur-sm shadow-[0_-6px_18px_rgba(39,25,42,0.06)]',
      'pb-[calc(var(--space-3)+var(--safe-bottom))]',
      className,
    )}
  >
    <div className="min-w-0">{leading}</div>
    <div className="m-sticky-bar-actions flex flex-wrap items-center justify-end gap-2 shrink-0">
      {children}
    </div>
  </div>
);

export default StickyActionBar;
