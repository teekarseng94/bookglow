import React from 'react';
import { OverlayTabs } from '../ui/OverlayTabs';
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
  tabs?: { id: string; label: string }[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
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
  tabs,
  activeTab,
  onTabChange,
}) => (
  <StaffDialogShell
    open={open}
    title={title}
    onClose={onClose}
    closeOnBackdrop={!saving}
    mobileFullscreen
    size="xl"
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
    <form id={formId} onSubmit={onSubmit} className="space-y-3">
      {tabs?.length ? (
        <OverlayTabs
          ariaLabel="Staff editor sections"
          value={activeTab || tabs[0].id}
          onChange={(id) => onTabChange?.(id)}
          items={tabs}
          className="-mx-4 -mt-4 sm:-mx-5 sm:-mt-4 px-4 sm:px-5"
        />
      ) : null}
      {children}
    </form>
  </StaffDialogShell>
);

export default StaffEditor;
