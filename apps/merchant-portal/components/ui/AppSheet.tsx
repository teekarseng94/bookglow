import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import { ModalBody, ModalFooter, ModalHeader } from './ModalParts';

export interface AppSheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: 'bottom' | 'right';
  zIndexClass?: string;
  className?: string;
  closeOnBackdrop?: boolean;
  busy?: boolean;
}

/**
 * Bookglow bottom/right sheet — same header/footer chrome as AppModal.
 */
export const AppSheet: React.FC<AppSheetProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'bottom',
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
    side === 'right'
      ? 'm-sheet-panel--right fixed inset-y-0 right-0 w-full max-w-md rounded-l-ui-lg'
      : 'm-sheet-panel--bottom fixed inset-x-0 bottom-0 max-h-[90dvh] rounded-t-ui-lg';

  return createPortal(
    <div className={cx('fixed inset-0', zIndexClass)} role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-ui-overlay border-0 cursor-default"
        aria-label="Close sheet"
        onClick={() => {
          if (closeOnBackdrop && !busy) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cx(
          'absolute flex flex-col bg-[var(--bg-surface)] shadow-ui-lg border border-[var(--line)]',
          'overflow-hidden',
          panelClass,
          className,
        )}
      >
        {title != null ? (
          <ModalHeader
            title={title}
            description={description}
            onClose={busy ? undefined : onClose}
          />
        ) : null}
        <ModalBody className="flex-1">{children}</ModalBody>
        {footer ? <ModalFooter>{footer}</ModalFooter> : null}
      </div>
    </div>,
    document.body,
  );
};

export default AppSheet;
