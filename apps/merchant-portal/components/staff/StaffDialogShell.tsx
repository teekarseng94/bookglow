import React from 'react';
import { AppModal } from '../ui/AppModal';

export interface StaffDialogShellProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Higher z for nested over StaffEditor (roles modal). */
  zIndexClass?: string;
  className?: string;
  /** When false, backdrop click does not close (e.g. while saving). */
  closeOnBackdrop?: boolean;
}

/**
 * Staff page dialog — uses shared AppModal chrome.
 */
export const StaffDialogShell: React.FC<StaffDialogShellProps> = ({
  open,
  title,
  onClose,
  children,
  footer,
  zIndexClass = 'z-[70]',
  className,
  closeOnBackdrop = true,
}) => (
  <AppModal
    open={open}
    onClose={onClose}
    title={title}
    footer={footer}
    size="md"
    zIndexClass={zIndexClass}
    className={className}
    closeOnBackdrop={closeOnBackdrop}
  >
    {children}
  </AppModal>
);

export default StaffDialogShell;
