import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import { ModalBody, ModalFooter, ModalHeader } from './ModalParts';

export interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
  /** Fullscreen (mobile detail) or right rail. */
  variant?: 'fullscreen' | 'right';
  zIndexClass?: string;
  className?: string;
  closeOnBackdrop?: boolean;
  busy?: boolean;
}

/**
 * Full-height drawer for mobile detail panels or desktop side rails.
 */
export const AppDrawer: React.FC<AppDrawerProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  headerActions,
  variant = 'fullscreen',
  zIndexClass = 'z-[80]',
  className,
  closeOnBackdrop = true,
  busy = false,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, busy]);

  if (!open || typeof document === 'undefined') return null;

  const panelClass =
    variant === 'right'
      ? 'fixed inset-y-0 right-0 w-full max-w-lg border-l'
      : 'fixed inset-0 w-full';

  return createPortal(
    <div className={cx('fixed inset-0', zIndexClass)} role="presentation">
      {variant === 'right' ? (
        <button
          type="button"
          className="absolute inset-0 bg-ui-overlay border-0 cursor-default"
          aria-label="Close drawer"
          onClick={() => {
            if (closeOnBackdrop && !busy) onClose();
          }}
        />
      ) : null}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cx(
          'grid overflow-hidden bg-[var(--bg-surface)]',
          footer ? 'grid-rows-[auto_minmax(0,1fr)_auto]' : 'grid-rows-[auto_minmax(0,1fr)]',
          'border-[var(--line)] shadow-ui-lg',
          panelClass,
          className,
        )}
      >
        <ModalHeader
          title={title}
          description={description}
          onClose={busy ? undefined : onClose}
          actions={headerActions}
        />
        <ModalBody>{children}</ModalBody>
        {footer ? <ModalFooter>{footer}</ModalFooter> : null}
      </div>
    </div>,
    document.body,
  );
};

export default AppDrawer;
