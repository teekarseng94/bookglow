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
 * Desktop: fixed-width order summary rail.
 * Mobile: bottom sheet when open.
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
  <aside
    className={cx(
      'md:sticky md:top-20 md:self-start',
      'md:w-[360px] lg:w-[400px] xl:w-[420px] md:shrink-0',
      'md:h-[calc(100vh-6.5rem)] md:flex md:flex-col',
      open ? 'fixed inset-0 z-[50] flex items-end md:static md:z-auto' : 'hidden md:flex',
      className,
    )}
  >
    {open ? (
      <button
        type="button"
        className="absolute inset-0 bg-ui-overlay md:hidden border-0 cursor-default"
        aria-label="Close cart overlay"
        onClick={onClose}
      />
    ) : null}

    <div
      className={cx(
        'relative bg-[var(--bg-surface)] border border-[var(--line)] shadow-ui-sm',
        'rounded-t-ui-lg md:rounded-ui-lg',
        'flex flex-col h-full overflow-hidden w-full',
        'max-h-[90vh] md:max-h-none md:h-full',
        'mb-[calc(72px+env(safe-area-inset-bottom,0px))] md:mb-0',
      )}
    >
      <div className="px-4 py-3 border-b border-[var(--line)] shrink-0 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <svg className="w-4 h-4 text-[var(--brand)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-bold tabular-nums truncate">
              {clockLabel}
              <span className="text-[var(--text-muted)] font-semibold"> · {dateLabel}</span>
            </span>
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mt-1">Order Summary</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {headerRight}
          <IconButton label="Close cart" size="sm" onClick={onClose} className="md:hidden">
            <span aria-hidden>×</span>
          </IconButton>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
        {children}
      </div>

      <div className="shrink-0 p-4 border-t border-[var(--line)] bg-[var(--bg-surface)] flex flex-col gap-3 pb-[max(0.75rem,var(--safe-bottom))] md:pb-4">
        {footer}
      </div>
    </div>
  </aside>
);

export default POSCartSheet;
