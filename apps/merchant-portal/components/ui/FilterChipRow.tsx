import React from 'react';
import { cx } from './cx';

export interface FilterChipRowProps {
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}

/** One horizontal, non-wrapping filter chip row. */
export const FilterChipRow: React.FC<FilterChipRowProps> = ({ children, ariaLabel, className }) => (
  <div className={cx('m-filter-chip-row m-filter-chips', className)} role="toolbar" aria-label={ariaLabel}>
    {children}
  </div>
);

export interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  selected = false,
  className,
  type = 'button',
  children,
  ...props
}) => (
  <button
    type={type}
    aria-pressed={selected}
    className={cx('m-filter-chip', selected && 'm-filter-chip--active', className)}
    {...props}
  >
    {children}
  </button>
);

export default FilterChipRow;
