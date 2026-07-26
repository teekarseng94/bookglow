import React from 'react';
import { AppModal, type AppModalSize } from './AppModal';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: AppModalSize;
  className?: string;
  closeOnBackdrop?: boolean;
  busy?: boolean;
  zIndexClass?: string;
}

/**
 * Presentational modal — thin wrapper over AppModal for backwards compatibility.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title = '',
  description,
  children,
  footer,
  size = 'md',
  className,
  closeOnBackdrop,
  busy,
  zIndexClass,
}) => (
  <AppModal
    open={open}
    onClose={onClose}
    title={title}
    description={description}
    footer={footer}
    size={size}
    className={className}
    closeOnBackdrop={closeOnBackdrop}
    busy={busy}
    zIndexClass={zIndexClass}
  >
    {children}
  </AppModal>
);

export default Modal;
