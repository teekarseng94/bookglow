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
      'sticky bottom-0 z-20',
      'flex items-center justify-between gap-3',
      'px-4 py-3 border-t border-[var(--line)]',
      'bg-[var(--bg-surface)]/95 backdrop-blur-sm',
      'pb-[calc(var(--space-3)+var(--safe-bottom))]',
      className,
    )}
  >
    <div className="min-w-0">{leading}</div>
    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">{children}</div>
  </div>
);

export default StickyActionBar;
