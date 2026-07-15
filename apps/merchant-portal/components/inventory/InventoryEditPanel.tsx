import React from 'react';
import { Modal } from '../ui/Modal';
import { InventorySaveBar } from './InventorySaveBar';
import { cx } from '../ui/cx';
import type { SaveStatusValue } from '../ui/SaveStatus';

export interface InventoryEditPanelProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  formId?: string;
  saving?: boolean;
  saveDisabled?: boolean;
  saveStatus?: SaveStatusValue;
  className?: string;
}

/**
 * Consistent edit chrome with sticky Save Changes.
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
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    size="lg"
    className={cx('max-w-2xl', className)}
    footer={
      <InventorySaveBar
        formId={formId}
        saving={saving}
        disabled={saveDisabled}
        status={saveStatus}
      />
    }
  >
    {children}
  </Modal>
);

export default InventoryEditPanel;
