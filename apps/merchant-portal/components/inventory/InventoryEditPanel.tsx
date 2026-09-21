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
 * Catalog editor chrome. Uses the shared editor drawer: full-screen on phones,
 * near-full-width on tablets, and a wide right rail on desktop.
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
    size="editor"
    zIndexClass="z-[90]"
    className={cx(className)}
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
