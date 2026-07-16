import React from 'react';
import { Button } from '../ui/Button';
import { SaveStatus, type SaveStatusValue } from '../ui/SaveStatus';
import { cx } from '../ui/cx';

export interface InventorySaveBarProps {
  saveLabel?: string;
  onSave?: () => void;
  saving?: boolean;
  disabled?: boolean;
  status?: SaveStatusValue;
  formId?: string;
  className?: string;
}

/** Explicit Save Changes control — parent owns submit handler via form id or onSave. */
export const InventorySaveBar: React.FC<InventorySaveBarProps> = ({
  saveLabel = 'Save Changes',
  onSave,
  saving,
  disabled,
  status = 'idle',
  formId,
  className,
}) => (
  <div className={cx('flex items-center justify-between gap-3 w-full', className)}>
    <SaveStatus status={saving ? 'saving' : status} />
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
);

export default InventorySaveBar;
