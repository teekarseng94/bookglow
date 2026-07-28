import React from 'react';
import { cx } from './cx';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'soft' | 'outline';
}

const sizeClass = {
  sm: 'm-icon-btn--sm h-8 w-8 rounded-ui-sm',
  md: 'm-icon-btn--md h-10 w-10 rounded-ui-sm',
  lg: 'm-icon-btn--lg h-12 w-12 rounded-ui-md',
} as const;

const variantClass = {
  ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]',
  soft: 'bg-[var(--bg-soft)] text-[var(--text-primary)] hover:bg-[var(--bg-selection)]',
  outline:
    'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--line)] hover:bg-[var(--bg-soft)]',
} as const;

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  size = 'md',
  variant = 'ghost',
  className,
  type = 'button',
  children,
  ...props
}) => (
  <button
    type={type}
    aria-label={label}
    title={props.title ?? label}
    className={cx(
      'inline-flex items-center justify-center transition-colors',
      'focus-visible:shadow-ui-focus-strong disabled:opacity-50 disabled:pointer-events-none',
      sizeClass[size],
      variantClass[variant],
      className,
    )}
    {...props}
  >
    {children}
  </button>
);

export default IconButton;
