import React from 'react';
import { cx } from './cx';

export interface ScrollTableProps {
  children: React.ReactNode;
  className?: string;
  /** Accessible name for the scrolling region. */
  label?: string;
}

/**
 * Horizontal scroll region for data tables. Does not hide columns or financial values.
 */
export const ScrollTable: React.FC<ScrollTableProps> = ({ children, className, label }) => (
  <div className={cx('m-table-scroll', className)} role="region" aria-label={label} tabIndex={0}>
    {children}
  </div>
);

export default ScrollTable;
