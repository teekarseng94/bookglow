import React from 'react';
import { Field, fieldControlClassName, type FieldProps } from './Field';
import { cx } from './cx';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps extends Omit<FieldProps, 'children'> {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  name?: string;
}

/**
 * Presentational select. Options and value are provided by the parent.
 */
export const SelectField: React.FC<SelectFieldProps> = ({
  id,
  label,
  hint,
  error,
  required,
  className,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  name,
}) => (
  <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>
    <select
      id={id}
      name={name}
      value={value}
      disabled={disabled}
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      onChange={(event) => onChange(event.target.value)}
      className={cx(fieldControlClassName, 'pr-8')}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  </Field>
);

export default SelectField;
