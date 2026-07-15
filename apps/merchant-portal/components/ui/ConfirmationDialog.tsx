import React from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
}

/**
 * Confirm / cancel shell. Parent supplies confirm handler and busy flag.
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
}) => (
  <Modal
    open={open}
    onClose={busy ? () => undefined : onClose}
    title={title}
    size="sm"
    footer={
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          size="sm"
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </div>
    }
  >
    {description ? <p className="text-sm text-[var(--text-secondary)]">{description}</p> : null}
  </Modal>
);

export default ConfirmationDialog;
