import React from 'react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--brand)] text-[var(--color-action-primary-text)] hover:bg-[var(--brand-hover)] shadow-ui-xs',
  secondary:
    'bg-[var(--bg-soft)] text-[var(--text-primary)] border border-[var(--line)] hover:bg-[var(--bg-selection)]',
  ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]',
  danger: 'bg-[var(--danger)] text-white hover:opacity-90 shadow-ui-xs',
  outline:
    'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--line-strong)] hover:bg-[var(--bg-soft)]',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-ui-sm',
  md: 'h-10 px-4 text-app-body gap-2 rounded-ui-sm',
  lg: 'h-12 px-5 text-base gap-2 rounded-ui-md',
};

/**
 * Presentational button. Receives labels and callbacks only — no business logic.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  type = 'button',
  disabled,
  children,
  ...props
}) => (
  <button
    type={type}
    disabled={disabled}
    className={cx(
      'inline-flex items-center justify-center font-semibold transition-colors',
      'focus-visible:shadow-ui-focus-strong disabled:opacity-50 disabled:pointer-events-none',
      variantClass[variant],
      sizeClass[size],
      fullWidth && 'w-full',
      className,
    )}
    {...props}
  >
    {children}
  </button>
);

export default Button;
