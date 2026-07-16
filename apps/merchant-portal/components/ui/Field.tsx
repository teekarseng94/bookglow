import React from 'react';
import { cx } from './cx';

export interface FieldProps {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Label + control wrapper. Parent supplies the input element and validation messages.
 */
export const Field: React.FC<FieldProps> = ({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}) => (
  <div className={cx('space-y-1.5', className)}>
    <label htmlFor={id} className="block text-app-label font-bold uppercase text-[var(--text-secondary)]">
      {label}
      {required ? <span className="text-[var(--danger)]"> *</span> : null}
    </label>
    {children}
    {error ? (
      <p id={`${id}-error`} className="text-xs text-[var(--danger)]" role="alert">
        {error}
      </p>
    ) : hint ? (
      <p id={`${id}-hint`} className="text-xs text-[var(--text-muted)]">
        {hint}
      </p>
    ) : null}
  </div>
);

export const fieldControlClassName = cx(
  'w-full h-10 px-3 rounded-ui-sm border border-[var(--line-strong)]',
  'bg-[var(--bg-surface)] text-[var(--text-primary)] text-app-body',
  'placeholder:text-[var(--text-muted)]',
  'focus-visible:shadow-ui-focus-strong focus-visible:border-[var(--brand)]',
  'disabled:opacity-50 disabled:bg-[var(--bg-soft)]',
);

export default Field;
