<<<<<<< HEAD
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import { IconButton } from './IconButton';
=======
import React from 'react';
import { AppSheet } from './AppSheet';
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
<<<<<<< HEAD
=======
  description?: React.ReactNode;
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: 'bottom' | 'right';
  className?: string;
<<<<<<< HEAD
}

/**
 * Presentational sheet/drawer. Parent owns open state and close behavior.
=======
  closeOnBackdrop?: boolean;
  busy?: boolean;
  zIndexClass?: string;
}

/**
 * Presentational sheet — thin wrapper over AppSheet for backwards compatibility.
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
 */
export const Sheet: React.FC<SheetProps> = ({
  open,
  onClose,
  title,
<<<<<<< HEAD
=======
  description,
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
  children,
  footer,
  side = 'bottom',
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

  const panelClass =
    side === 'right'
      ? 'fixed inset-y-0 right-0 w-full max-w-md rounded-l-ui-lg'
      : 'fixed inset-x-0 bottom-0 max-h-[90dvh] rounded-t-ui-lg pb-[var(--safe-bottom)]';

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-ui-overlay border-0 cursor-default"
        aria-label="Close sheet"
        onClick={onClose}
      />
      <div
        className={cx(
          'absolute flex flex-col bg-[var(--bg-surface)] shadow-ui-lg',
          'border border-[var(--line)]',
          panelClass,
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--line)]">
          <div className="min-w-0 text-base font-semibold text-[var(--text-primary)] truncate">
            {title}
          </div>
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
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda

export default Sheet;
