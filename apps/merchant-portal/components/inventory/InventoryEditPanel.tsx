import React from 'react';
import { AppDrawer } from '../ui/AppDrawer';
import { InventorySaveBar } from './InventorySaveBar';
import { cx } from '../ui/cx';
import type { SaveStatusValue } from '../ui/SaveStatus';

export interface InventoryEditPanelProps {
  open: boolean;
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  formId?: string;
  saving?: boolean;
  saveDisabled?: boolean;
  saveStatus?: SaveStatusValue;
  className?: string;
}

/**
 * Consistent edit chrome with sticky Cancel + Save Changes.
 * Right-side drawer on desktop (starts below the app header); full width below 640px so mobile
 * gets the same effect as a full-screen editor without a separate mobile-only component.
 * Closing calls onClose only — parent owns discard/save rules (no silent save).
 */
export const InventoryEditPanel: React.FC<InventoryEditPanelProps> = ({
  open,
  title,
  onClose,
  children,
  formId = 'inventory-edit-form',
  saving,
  saveDisabled,
  saveStatus = 'idle',
  className,
}) => (
  <AppDrawer
    open={open}
    onClose={onClose}
    title={title}
    variant="right"
    zIndexClass="z-[90]"
    className={cx('max-w-full sm:max-w-[420px]', className)}
    footer={
      <InventorySaveBar
        formId={formId}
        onCancel={onClose}
        saving={saving}
        disabled={saveDisabled}
        status={saveStatus}
      />
    }
  >
    {children}
  </AppDrawer>
);

export default InventoryEditPanel;
