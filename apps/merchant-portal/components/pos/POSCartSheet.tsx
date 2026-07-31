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
 * Phone (<640): compact bottom sheet.
 * Tablet (640–1199): persistent Order Summary rail beside the catalogue.
 * Desktop (1200+): existing desktop rail (unchanged structure).
 */
export const POSCartSheet: React.FC<POSCartSheetProps> = ({
  open, onClose, clockLabel, dateLabel, headerRight, children, footer, className,
}) => (
  <aside
    className={cx(
      'sm:sticky sm:top-3 sm:self-start posd:top-4',
      'sm:w-[min(40%,340px)] sm:min-w-[280px] sm:max-w-[360px] sm:shrink-0',
      'posd:w-[380px] posd:max-w-none xl:w-[420px]',
      'sm:flex sm:h-[calc(100vh-8.75rem)] sm:flex-col',
      /* 1024+: shell sidebar replaces bottom nav */
      'lg:h-[calc(100vh-7.5rem)]',
      open
        ? 'fixed inset-0 z-[50] flex items-end sm:static sm:z-auto'
        : 'hidden sm:flex',
      className,
    )}
  >
    {open ? (
      <button
        type="button"
        className="absolute inset-0 cursor-default border-0 bg-ui-overlay sm:hidden"
        aria-label="Close cart overlay"
        onClick={onClose}
      />
    ) : null}
    <div
      className={cx(
        'm-pos-cart-sheet relative flex h-full w-full flex-col overflow-hidden border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-sm',
        'rounded-t-ui-lg sm:rounded-ui-lg',
        'max-h-[92vh] sm:h-full sm:max-h-none',
        'mb-[calc(72px+env(safe-area-inset-bottom,0px))] sm:mb-0',
      )}
    >
      {/* —— Phone + tablet compact header —— */}
      <div className="m-pos-cart-header posd:hidden shrink-0 border-b border-[var(--line)] px-3 pt-2 pb-2.5">
        {/* Brand + close: phone sheet only */}
        <div className="mb-2 flex items-center justify-between gap-2 sm:hidden">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="bookglow-brand-mark shrink-0 text-[var(--brand)]" aria-hidden>
              ✦
            </span>
            <span className="bookglow-wordmark truncate text-sm font-bold text-[var(--brand)]">BookGlow</span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {headerRight}
            <IconButton label="Close cart" size="sm" onClick={onClose}>
              <span aria-hidden>×</span>
            </IconButton>
          </div>
        </div>

        {/* Tablet actions row */}
        <div className="mb-2 hidden items-center justify-end gap-0.5 sm:flex">
          {headerRight}
        </div>

        <div className="m-pos-cart-header-banner flex items-center gap-2.5 rounded-ui-md bg-[var(--brand-soft)] px-3 py-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-sm bg-[var(--brand)] text-white"
            aria-hidden
          >
            <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="m-pos-cart-title text-[15px] font-bold leading-tight text-[var(--text-primary)]">
              Order Summary
            </h3>
            <p className="m-pos-cart-meta mt-0.5 truncate text-[12px] tabular-nums text-[var(--text-muted)]">
              {clockLabel} · {dateLabel}
            </p>
          </div>
        </div>
      </div>

      {/* —— Desktop header (1200+) —— */}
      <div className="m-pos-cart-header hidden shrink-0 border-b border-[var(--line)] posd:block">
        <div className="relative flex min-h-[56px] items-center justify-center border-b border-[var(--line)] px-12 py-2 text-center">
          <div className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
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
        <h3 className="m-pos-cart-title px-4 py-3 text-base font-bold text-[var(--text-primary)]">
          Order Summary
        </h3>
      </div>

      <div className="m-pos-cart-body min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5 scrollbar-thin posd:space-y-3 posd:px-4 posd:py-3">
        {children}
      </div>
      <div className="m-pos-cart-footer flex shrink-0 flex-col gap-2.5 border-t border-[var(--line)] bg-[var(--bg-surface)] p-3 pb-[max(0.75rem,var(--safe-bottom))] posd:gap-3 posd:p-4 posd:pb-4">
        {footer}
      </div>
    </div>
  </aside>
);

export default POSCartSheet;
