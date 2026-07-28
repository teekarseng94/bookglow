import React from 'react';
import { Button } from '../ui/Button';
import { SaveStatus, type SaveStatusValue } from '../ui/SaveStatus';
import { cx } from '../ui/cx';

export interface InventorySaveBarProps {
  saveLabel?: string;
  onSave?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  saving?: boolean;
  disabled?: boolean;
  status?: SaveStatusValue;
  formId?: string;
  className?: string;
}

/** Explicit Cancel + Save Changes control — parent owns submit handler via form id or onSave. */
export const InventorySaveBar: React.FC<InventorySaveBarProps> = ({
  saveLabel = 'Save Changes',
  onSave,
  onCancel,
  cancelLabel = 'Cancel',
  saving,
  disabled,
  status = 'idle',
  formId,
  className,
}) => (
  <div className={cx('flex items-center justify-between gap-3 w-full', className)}>
    <SaveStatus status={saving ? 'saving' : status} />
    <div className="flex items-center gap-2">
      {onCancel ? (
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          {cancelLabel}
        </Button>
      ) : null}
      <Button
        type={formId ? 'submit' : 'button'}
        form={formId}
        variant="primary"
        disabled={disabled || saving}
        onClick={formId ? undefined : onSave}
      >
        {saving ? 'Saving…' : saveLabel}
      </Button>
    </div>
  </div>
);

export default InventorySaveBar;
