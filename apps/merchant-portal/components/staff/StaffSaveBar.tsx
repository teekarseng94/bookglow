import React from 'react';
import { Button } from '../ui/Button';
import { SaveStatus, type SaveStatusValue } from '../ui/SaveStatus';
<<<<<<< HEAD
import { StickyActionBar } from '../ui/StickyActionBar';
=======
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
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

<<<<<<< HEAD
/**
 * Sticky Save Changes footer. Close/cancel does not save — parent owns submit.
 */
=======
/** Compact sticky footer actions — equal-width buttons on mobile. */
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
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
<<<<<<< HEAD
  <StickyActionBar
    className={cx('static border-0 bg-transparent px-0 py-0 pb-0', className)}
    leading={<SaveStatus status={saving ? 'saving' : status} />}
  >
    <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
      {cancelLabel}
    </Button>
    <Button
      type={formId ? 'submit' : 'button'}
      form={formId}
      variant="primary"
      disabled={disabled || saving}
    >
      {saving ? 'Saving…' : saveLabel}
    </Button>
  </StickyActionBar>
=======
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
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
);

export default StaffSaveBar;
