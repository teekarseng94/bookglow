import React from 'react';
import { Button } from '../ui/Button';
import { SaveStatus, type SaveStatusValue } from '../ui/SaveStatus';
import { StickyActionBar } from '../ui/StickyActionBar';
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

/**
 * Sticky Save Changes footer. Close/cancel does not save — parent owns submit.
 */
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
);

export default StaffSaveBar;
