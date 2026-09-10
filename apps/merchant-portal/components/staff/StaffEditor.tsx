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
    size="lg"
    className={`sm:!w-[min(720px,calc(100vw-48px))] sm:!max-w-[720px] ${className ?? ''}`}
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
        <nav
          className="-mx-4 -mt-4 sm:-mx-5 sm:-mt-4 px-4 sm:px-5 border-b border-[var(--line)] flex overflow-x-auto"
          aria-label="Staff editor sections"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange?.(tab.id)}
              className={`shrink-0 border-b-2 px-3 py-3 text-xs font-bold transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--brand)] text-[var(--brand)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      ) : null}
      {children}
    </form>
  </StaffDialogShell>
);

export default StaffEditor;
