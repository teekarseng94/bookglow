import React from 'react';
import { StaffDialogShell } from './StaffDialogShell';
import { StaffSaveBar } from './StaffSaveBar';
import type { SaveStatusValue } from '../ui/SaveStatus';

export interface StaffEditorProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  saving?: boolean;
  saveDisabled?: boolean;
  saveStatus?: SaveStatusValue;
  saveLabel?: string;
  tone?: 'create' | 'edit';
  formId?: string;
  className?: string;
}

/**
 * Staff add/edit dialog — white header, sticky footer, scrollable body.
 */
export const StaffEditor: React.FC<StaffEditorProps> = ({
  open,
  title,
  onClose,
  onSubmit,
  children,
  saving,
  saveDisabled,
  saveStatus = 'idle',
  saveLabel = 'Save Changes',
  formId = 'staff-editor-form',
  className,
}) => (
  <StaffDialogShell
    open={open}
    title={title}
    onClose={onClose}
    closeOnBackdrop={!saving}
    mobileFullscreen
    className={className}
    footer={
      <StaffSaveBar
        formId={formId}
        onCancel={onClose}
        saving={saving}
        disabled={saveDisabled}
        status={saveStatus}
        saveLabel={saveLabel}
      />
    }
  >
    <form id={formId} onSubmit={onSubmit} className="space-y-1">
      {children}
    </form>
  </StaffDialogShell>
);

export default StaffEditor;
