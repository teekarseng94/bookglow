import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import { ModalBody, ModalFooter, ModalHeader } from './ModalParts';
import { useDialogInteraction } from './useDialogInteraction';

export type AppDrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'editor';

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
  /** Right-rail width. `editor` is full-screen on phones and near-full on tablets. */
  size?: AppDrawerSize;
  zIndexClass?: string;
  className?: string;
  closeOnBackdrop?: boolean;
  busy?: boolean;
}

const sizeClass: Record<AppDrawerSize, string> = {
  sm: 'm-drawer--sm',
  md: 'm-drawer--md',
  lg: 'm-drawer--lg',
  xl: 'm-drawer--xl',
  editor: 'm-drawer--editor',
};

/**
 * Full-height drawer for mobile detail panels or desktop side rails.
 * Width follows `--drawer-size-*` tokens and the panel's own container, not a fixed 420px rail.
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
  size = 'md',
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

  return createPortal(
    <div className={cx('fixed inset-0', zIndexClass)} role="presentation">
      {variant === 'right' ? (
        <button
          type="button"
          className="absolute inset-0 bg-ui-overlay border-0 cursor-default"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => {
            if (closeOnBackdrop && !busy) onClose();
          }}
        />
      ) : null}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cx(
          'm-drawer grid overflow-hidden bg-[var(--bg-surface)]',
          footer ? 'grid-rows-[auto_minmax(0,1fr)_auto]' : 'grid-rows-[auto_minmax(0,1fr)]',
          'border-[var(--line)] shadow-ui-lg',
          variant === 'right' ? 'm-drawer--right' : 'm-drawer--fullscreen',
          variant === 'right' && sizeClass[size],
          className,
        )}
      >
        <ModalHeader
          title={title}
          description={description}
          titleId={titleId}
          descriptionId={description ? descriptionId : undefined}
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
