import React from 'react';
import { createPortal } from 'react-dom';
import { StaffSaveBar } from './StaffSaveBar';
import { cx } from '../ui/cx';
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
 * Full-width mobile / centered desktop editor shell.
 * Sticky Save Changes; close does not save — parent owns discard rules.
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
  tone = 'create',
  formId = 'staff-editor-form',
  className,
}) => {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-slate-900/50 sm:backdrop-blur-sm flex justify-center sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        id={formId}
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className={cx(
          'bg-[var(--bg-surface)] w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-ui-lg',
          'shadow-ui-lg flex flex-col overflow-hidden border border-[var(--line)]',
          className,
        )}
      >
        <div
          className={cx(
            'flex-shrink-0 px-5 py-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:pt-4',
            'flex justify-between items-center text-white',
            tone === 'edit' ? 'bg-amber-600' : 'bg-[var(--brand)]',
          )}
        >
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-1">
          {children}
        </div>

        <div className="flex-shrink-0 border-t border-[var(--line)] bg-[var(--bg-surface)] px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <StaffSaveBar
            formId={formId}
            onCancel={onClose}
            saving={saving}
            disabled={saveDisabled}
            status={saveStatus}
            saveLabel={saveLabel}
          />
        </div>
      </form>
    </div>,
    document.body,
  );
};

export default StaffEditor;
