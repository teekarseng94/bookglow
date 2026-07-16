import React from 'react';
import { IconButton } from '../ui/IconButton';
import { cx } from '../ui/cx';

export interface POSCartSheetProps {
  open: boolean;
  onClose: () => void;
  clockLabel: string;
  dateLabel: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
  className?: string;
}

/**
 * Desktop: persistent cart rail.
 * Mobile: bottom sheet when open (parent owns open + isProcessing).
 */
export const POSCartSheet: React.FC<POSCartSheetProps> = ({
  open,
  onClose,
  clockLabel,
  dateLabel,
  headerRight,
  children,
  footer,
  className,
}) => (
  <div
    className={cx(
      'md:sticky md:top-20 md:h-[calc(100vh-8rem)] md:flex md:flex-col',
      open ? 'fixed inset-0 z-[50] flex items-end md:static md:z-auto' : 'hidden md:flex',
      className,
    )}
  >
    {open ? (
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 md:hidden border-0 cursor-default"
        aria-label="Close cart overlay"
        onClick={onClose}
      />
    ) : null}

    <div
      className={cx(
        'relative bg-[var(--bg-surface)]/95 border border-[var(--line)] rounded-t-ui-lg md:rounded-ui-lg shadow-ui-sm',
        'flex flex-col h-full overflow-hidden w-full md:w-auto',
        'max-h-[90vh] md:max-h-none md:h-[calc(100vh-8rem)]',
        'mb-[calc(72px+env(safe-area-inset-bottom,0px))] md:mb-0',
      )}
    >
      <div className="py-2 px-3 border-b border-[var(--line)] bg-gradient-to-r from-[var(--brand-soft)] to-[var(--bg-soft)] shrink-0">
        <div className="flex flex-col items-center justify-center">
          <div className="text-xl font-black text-[var(--brand-deep)] tabular-nums leading-tight">
            {clockLabel}
          </div>
          <div className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">{dateLabel}</div>
        </div>
      </div>

      <div className="px-3 py-2 sm:px-4 sm:py-2.5 border-b border-[var(--line)] bg-[var(--bg-soft)]/60 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Order Summary</h3>
          <div className="flex items-center gap-1">
            {headerRight}
            <IconButton label="Close cart" size="sm" onClick={onClose} className="md:hidden">
              <span aria-hidden>×</span>
            </IconButton>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 sm:p-4 space-y-2 scrollbar-thin">
        {children}
      </div>

      <div className="shrink-0 p-3 sm:p-4 border-t border-[var(--line)] bg-[var(--bg-soft)]/80 flex flex-col gap-2 pb-[max(0.75rem,var(--safe-bottom))] md:pb-3">
        {footer}
      </div>
    </div>
  </div>
);

export default POSCartSheet;
