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
 * Desktop (lg+): persistent order-summary rail.
 * Phone + tablet: compact bottom sheet matching mobile Order Summary mockup.
 */
export const POSCartSheet: React.FC<POSCartSheetProps> = ({
  open, onClose, clockLabel, dateLabel, headerRight, children, footer, className,
}) => (
  <aside
    className={cx(
      'lg:sticky lg:top-4 lg:self-start',
      'lg:w-[380px] xl:w-[420px] lg:shrink-0',
      'lg:h-[calc(100vh-7.5rem)] lg:flex lg:flex-col',
      open ? 'fixed inset-0 z-[50] flex items-end lg:static lg:z-auto' : 'hidden lg:flex',
      className,
    )}
  >
    {open ? (
      <button type="button" className="absolute inset-0 cursor-default border-0 bg-ui-overlay lg:hidden" aria-label="Close cart overlay" onClick={onClose} />
    ) : null}
    <div className={cx(
      'm-pos-cart-sheet relative flex h-full w-full flex-col overflow-hidden border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-sm',
      'rounded-t-ui-lg lg:rounded-ui-lg',
      'max-h-[92vh] lg:h-full lg:max-h-none',
      'mb-[calc(72px+env(safe-area-inset-bottom,0px))] lg:mb-0',
    )}>
      {/* —— Mobile compact header —— */}
      <div className="m-pos-cart-header lg:hidden shrink-0 border-b border-[var(--line)] px-3 pt-2 pb-2.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="bookglow-brand-mark text-[var(--brand)] shrink-0" aria-hidden>
              ✦
            </span>
            <span className="bookglow-wordmark text-sm font-bold text-[var(--brand)] truncate">BookGlow</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {headerRight}
            <IconButton label="Close cart" size="sm" onClick={onClose}>
              <span aria-hidden>×</span>
            </IconButton>
          </div>
        </div>
        <div className="m-pos-cart-header-banner flex items-center gap-2.5 rounded-ui-md bg-[var(--brand-soft)] px-3 py-2">
          <div className="w-9 h-9 rounded-ui-sm bg-[var(--brand)] text-white flex items-center justify-center shrink-0" aria-hidden>
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="m-pos-cart-title text-[15px] font-bold text-[var(--text-primary)] leading-tight">
              Order Summary
            </h3>
            <p className="m-pos-cart-meta text-[12px] text-[var(--text-muted)] tabular-nums mt-0.5 truncate">
              {clockLabel} · {dateLabel}
            </p>
          </div>
        </div>
      </div>

      {/* —— Desktop header (unchanged structure) —— */}
      <div className="hidden lg:block m-pos-cart-header shrink-0 border-b border-[var(--line)]">
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
          </div>
        </div>
        <h3 className="m-pos-cart-title px-4 py-3 text-base font-bold text-[var(--text-primary)]">Order Summary</h3>
      </div>

      <div className="m-pos-cart-body min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5 lg:space-y-3 lg:px-4 lg:py-3 scrollbar-thin">
        {children}
      </div>
      <div className="m-pos-cart-footer flex shrink-0 flex-col gap-2.5 border-t border-[var(--line)] bg-[var(--bg-surface)] p-3 pb-[max(0.75rem,var(--safe-bottom))] lg:gap-3 lg:p-4 lg:pb-4">
        {footer}
      </div>
    </div>
  </aside>
);

export default POSCartSheet;
