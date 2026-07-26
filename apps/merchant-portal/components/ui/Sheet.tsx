import React from 'react';
import { AppSheet } from './AppSheet';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: 'bottom' | 'right';
  className?: string;
  closeOnBackdrop?: boolean;
  busy?: boolean;
  zIndexClass?: string;
}

/**
 * Presentational sheet — thin wrapper over AppSheet for backwards compatibility.
 */
export const Sheet: React.FC<SheetProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'bottom',
  className,
  closeOnBackdrop,
  busy,
  zIndexClass,
}) => (
  <AppSheet
    open={open}
    onClose={onClose}
    title={title}
    description={description}
    footer={footer}
    side={side}
    className={className}
    closeOnBackdrop={closeOnBackdrop}
    busy={busy}
    zIndexClass={zIndexClass}
  >
    {children}
  </AppSheet>
);

export default Sheet;
