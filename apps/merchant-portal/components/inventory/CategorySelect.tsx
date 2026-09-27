import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { cx } from '../ui/cx';

export interface CategorySelectProps {
  id?: string;
  label?: string;
  value: string;
  categories: string[];
  onChange: (value: string) => void;
  onAddCategory: () => void;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  hint?: string;
}

/**
 * Merchant category picker. Empty value is "Select category" — never Massage.
 * "+ Add new category" lives in the menu so merchants do not leave the editor.
 */
export const CategorySelect: React.FC<CategorySelectProps> = ({
  id,
  label = 'Category',
  value,
  categories,
  onChange,
  onAddCategory,
  required = true,
  error,
  disabled,
  hint,
}) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const listId = `${fieldId}-list`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const display = value || 'Select category';
  const empty = categories.length === 0;

  return (
    <div ref={rootRef} className="m-category-select">
      <label htmlFor={fieldId} className="m-settings-label block uppercase">
        {label}
        {required ? <span className="text-[var(--danger)]"> *</span> : null}
      </label>
      <button
        type="button"
        id={fieldId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        aria-required={required || undefined}
        onClick={() => setOpen((current) => !current)}
        className={cx(
          'm-settings-control m-category-select__trigger w-full outline-none font-medium',
          !value && 'm-category-select__trigger--placeholder',
          error && 'border-[var(--danger)]',
        )}
      >
        <span className="min-w-0 truncate">{display}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="m-category-select__menu"
        >
          {empty ? (
            <li className="m-category-select__empty" role="presentation">
              No categories yet
            </li>
          ) : (
            categories.map((name) => {
              const selected = name === value;
              return (
                <li key={name} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cx('m-category-select__option', selected && 'm-category-select__option--selected')}
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                    }}
                  >
                    {name}
                  </button>
                </li>
              );
            })
          )}
          <li role="presentation" className="m-category-select__divider">
            <button
              type="button"
              className="m-category-select__add"
              onClick={() => {
                setOpen(false);
                onAddCategory();
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {empty ? 'Create your first category' : 'Add new category'}
            </button>
          </li>
        </ul>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 m-settings-hint text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 m-settings-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

export default CategorySelect;
