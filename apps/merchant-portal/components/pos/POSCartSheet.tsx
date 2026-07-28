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
 * Desktop: persistent order-summary rail.
 * Mobile: bottom sheet when open.
 */
export const POSCartSheet: React.FC<POSCartSheetProps> = ({
  open, onClose, clockLabel, dateLabel, headerRight, children, footer, className,
}) => (
  <aside
    className={cx(
      'md:sticky md:top-4 md:self-start',
      'md:w-[380px] xl:w-[420px] md:shrink-0',
      'md:h-[calc(100vh-7.5rem)] md:flex md:flex-col',
      open ? 'fixed inset-0 z-[50] flex items-end md:static md:z-auto' : 'hidden md:flex',
      className,
    )}
  >
    {open ? (
      <button type="button" className="absolute inset-0 cursor-default border-0 bg-ui-overlay md:hidden" aria-label="Close cart overlay" onClick={onClose} />
    ) : null}
    <div className={cx(
      'm-pos-cart-sheet relative flex h-full w-full flex-col overflow-hidden border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-sm',
      'rounded-t-ui-lg md:rounded-ui-lg',
      'max-h-[90vh] md:h-full md:max-h-none',
      'mb-[calc(72px+env(safe-area-inset-bottom,0px))] md:mb-0',
    )}>
      <div className="m-pos-cart-header shrink-0 border-b border-[var(--line)]">
        <div className="relative flex min-h-[56px] items-center justify-center border-b border-[var(--line)] px-12 py-2 text-center">
          <div className="flex items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="m-pos-cart-meta tabular-nums">
              <span className="block text-sm font-bold text-[var(--brand)]">{clockLabel}</span>
              <span className="block text-[11px] font-medium text-[var(--text-muted)]">{dateLabel}</span>
            </span>
          </div>
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {headerRight}
            <IconButton label="Close cart" size="sm" onClick={onClose} className="md:hidden">
              <span aria-hidden>×</span>
            </IconButton>
          </div>
        </div>
        <h3 className="m-pos-cart-title px-4 py-3 text-base font-bold text-[var(--text-primary)]">Order Summary</h3>
      </div>
      <div className="m-pos-cart-body min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 scrollbar-thin">
        {children}
      </div>
      <div className="m-pos-cart-footer flex shrink-0 flex-col gap-3 border-t border-[var(--line)] bg-[var(--bg-surface)] p-4 pb-[max(0.75rem,var(--safe-bottom))] md:pb-4">
        {footer}
      </div>
    </div>
  </aside>
);

export default POSCartSheet;
