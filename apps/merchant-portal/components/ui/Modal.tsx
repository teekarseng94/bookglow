<<<<<<< HEAD
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import { IconButton } from './IconButton';
=======
import React from 'react';
import { AppModal, type AppModalSize } from './AppModal';
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
<<<<<<< HEAD
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClass = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const;

/**
 * Presentational modal. Parent owns open state; no save/delete logic here.
=======
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
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
<<<<<<< HEAD
  title,
=======
  title = '',
  description,
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
  children,
  footer,
  size = 'md',
  className,
<<<<<<< HEAD
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ui-overlay border-0 cursor-default"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'relative z-[1] w-full flex flex-col',
          'bg-[var(--bg-surface)] shadow-ui-lg border border-[var(--line)]',
          'rounded-t-ui-lg sm:rounded-ui-lg',
          'max-h-[92dvh] sm:max-h-[85vh]',
          sizeClass[size],
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--line)]">
          <h2 className="min-w-0 text-base font-semibold text-[var(--text-primary)] truncate">
            {title}
          </h2>
          <IconButton label="Close" size="sm" onClick={onClose}>
            <span aria-hidden>×</span>
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-[var(--line)] px-4 py-3 bg-[var(--bg-soft)]">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};
=======
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
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda

export default Modal;
