import React from 'react';
import { cx } from './cx';

export interface BooleanSettingRowProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

/** Compact labelled checkbox row — not a card. */
export const BooleanSettingRow: React.FC<BooleanSettingRowProps> = ({
  id,
  label,
  checked,
  onChange,
  hint,
  disabled,
  className,
}) => (
  <div className={cx('m-boolean-row', className)}>
    <input
      id={id}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      aria-describedby={hint ? `${id}-hint` : undefined}
    />
    <div className="min-w-0">
      <label htmlFor={id} className="m-boolean-row__label">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="m-settings-hint">
          {hint}
        </p>
      ) : null}
    </div>
  </div>
);

export default BooleanSettingRow;
