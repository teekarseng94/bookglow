import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import { ModalBody, ModalFooter, ModalHeader } from './ModalParts';

export type AppModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AppModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional controls next to the close button (e.g. settings). */
  headerActions?: React.ReactNode;
  size?: AppModalSize;
  /** Overlay z-index utility class. Default z-[90]. */
  zIndexClass?: string;
  className?: string;
  /** When false, backdrop click does not close. */
  closeOnBackdrop?: boolean;
  /** Disable Escape / backdrop while busy. */
  busy?: boolean;
  /** Body rendered as a form (submit via footer primary). */
  asForm?: boolean;
  formId?: string;
  onSubmit?: React.FormEventHandler;
  bodyClassName?: string;
}

const sizeClass: Record<AppModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Canonical Bookglow dialog: sticky white header, scrollable body, sticky footer.
 * Mobile: inset padding + max height within viewport; never full-bleed colored chrome.
 */
export const AppModal: React.FC<AppModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  headerActions,
  size = 'md',
  zIndexClass = 'z-[90]',
  className,
  closeOnBackdrop = true,
  busy = false,
  asForm = false,
  formId,
  onSubmit,
  bodyClassName,
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

  const handleClose = () => {
    if (!busy) onClose();
  };

  return createPortal(
    <div
      className={cx(
        'fixed inset-0 flex items-center justify-center',
        'p-3',
        'pt-[max(0.75rem,env(safe-area-inset-top))]',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        'pl-[max(0.75rem,env(safe-area-inset-left))]',
        'pr-[max(0.75rem,env(safe-area-inset-right))]',
        zIndexClass,
      )}
    >
      <button
        type="button"
        className="absolute inset-0 bg-ui-overlay border-0 cursor-default"
        aria-label="Close dialog"
        onClick={() => {
          if (closeOnBackdrop && !busy) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        onClick={(e) => e.stopPropagation()}
        className={cx(
          'relative z-[1] w-[calc(100vw-24px)]',
          sizeClass[size],
          'max-h-[calc(100dvh-24px)]',
          'grid overflow-hidden',
          footer ? 'grid-rows-[auto_minmax(0,1fr)_auto]' : 'grid-rows-[auto_minmax(0,1fr)]',
          'm-modal-panel bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-lg shadow-ui-lg',
          className,
        )}
      >
        <ModalHeader
          title={title}
          description={description}
          onClose={handleClose}
          actions={headerActions}
        />

        <ModalBody
          as={asForm ? 'form' : 'div'}
          id={formId}
          onSubmit={onSubmit}
          className={bodyClassName}
        >
          {children}
        </ModalBody>

        {footer ? <ModalFooter>{footer}</ModalFooter> : null}
      </div>
    </div>,
    document.body,
  );
};

export default AppModal;
