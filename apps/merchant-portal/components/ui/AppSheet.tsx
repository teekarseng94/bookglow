import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import { ModalBody, ModalFooter, ModalHeader } from './ModalParts';
import { useDialogInteraction } from './useDialogInteraction';

export interface AppSheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: 'bottom' | 'right';
  /** Mobile presentation only; desktop/right-sheet behavior remains unchanged. */
  mobileMode?: 'sheet' | 'full-screen';
  showHandle?: boolean;
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
  mobileMode = 'sheet',
  showHandle = true,
  zIndexClass = 'z-[80]',
  className,
  closeOnBackdrop = true,
  busy = false,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useDialogInteraction({ open, busy, onClose, panelRef });

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
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => {
          if (closeOnBackdrop && !busy) onClose();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title != null ? titleId : undefined}
        aria-label={title == null ? 'Options' : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cx(
          'absolute flex flex-col bg-[var(--bg-surface)] shadow-ui-lg border border-[var(--line)]',
          'overflow-hidden',
          panelClass,
          mobileMode === 'full-screen' && 'm-sheet-panel--fullscreen',
          className,
        )}
      >
        {side === 'bottom' && showHandle && mobileMode === 'sheet' ? (
          <div className="m-sheet-handle shrink-0" aria-hidden="true" />
        ) : null}
        {title != null ? (
          <ModalHeader
            title={title}
            description={description}
            titleId={titleId}
            descriptionId={description ? descriptionId : undefined}
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
