import React from 'react';
import { Button } from '../ui/Button';
import { SaveStatus, type SaveStatusValue } from '../ui/SaveStatus';
import { cx } from '../ui/cx';

export interface StaffSaveBarProps {
  onCancel: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  saving?: boolean;
  disabled?: boolean;
  status?: SaveStatusValue;
  formId?: string;
  className?: string;
}

/** Compact sticky footer actions — equal-width buttons on mobile. */
export const StaffSaveBar: React.FC<StaffSaveBarProps> = ({
  onCancel,
  saveLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  saving,
  disabled,
  status = 'idle',
  formId,
  className,
}) => (
  <div className={cx('space-y-2', className)}>
    {status !== 'idle' || saving ? (
      <div className="flex justify-center sm:justify-start">
        <SaveStatus status={saving ? 'saving' : status} />
      </div>
    ) : null}
    <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={onCancel}
        disabled={saving}
        className="w-full sm:w-auto min-h-[44px]"
      >
        {cancelLabel}
      </Button>
      <Button
        type={formId ? 'submit' : 'button'}
        form={formId}
        variant="primary"
        size="md"
        disabled={disabled || saving}
        className="w-full sm:w-auto min-h-[44px]"
      >
        {saving ? 'Saving…' : saveLabel}
      </Button>
    </div>
  </div>
);

export default StaffSaveBar;
