import React from 'react';
import { cx } from './cx';
import { IconButton } from './IconButton';

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export interface ModalHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  titleId?: string;
  descriptionId?: string;
  onClose?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  description,
  titleId,
  descriptionId,
  onClose,
  actions,
  className,
}) => (
  <header
    className={cx(
      'm-modal-header flex items-start justify-between gap-3 px-4 py-3 sm:px-5',
      'border-b border-[var(--line)] bg-[var(--bg-surface)]',
      className,
    )}
  >
    <div className="min-w-0 flex-1 space-y-0.5">
      <h2 id={titleId} className="m-modal-title text-base sm:text-lg font-bold text-[var(--text-primary)] truncate">
        {title}
      </h2>
      {description ? (
        <p id={descriptionId} className="m-modal-desc text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2">
          {description}
        </p>
      ) : null}
    </div>
    <div className="flex items-center gap-1 shrink-0">
      {actions}
      {onClose ? (
        <IconButton
          label="Close"
          size="md"
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] -mr-1"
        >
          <CloseIcon />
        </IconButton>
      ) : null}
    </div>
  </header>
);

export interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'form';
  onSubmit?: React.FormEventHandler;
  id?: string;
}

export const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  className,
  as = 'div',
  onSubmit,
  id,
}) => {
  const Comp = as;
  return (
    <Comp
      id={id}
      onSubmit={onSubmit}
      className={cx(
        'm-modal-body min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 space-y-4',
        className,
      )}
    >
      {children}
    </Comp>
  );
};

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => (
  <footer
    className={cx(
      'm-modal-footer border-t border-[var(--line)] bg-[var(--bg-surface)]',
      'px-4 py-3 sm:px-5',
      'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
      className,
    )}
  >
    {children}
  </footer>
);

export interface ModalFooterActionsProps {
  children: React.ReactNode;
  className?: string;
}

/** Standard Cancel + primary action row. */
export const ModalFooterActions: React.FC<ModalFooterActionsProps> = ({ children, className }) => (
  <div className={cx('m-modal-footer-actions flex items-center justify-end gap-2', className)}>
    {children}
  </div>
);

export default ModalHeader;
