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
 * Desktop (1200+): sticky ~360px Order Summary matching the approved reference.
 */
export const POSCartSheet: React.FC<POSCartSheetProps> = ({
  open, onClose, clockLabel, dateLabel, headerRight, children, footer, className,
}) => (
  <aside
    className={cx(
      'sm:sticky sm:top-3 sm:self-start posd:top-4',
      'sm:w-[min(40%,340px)] sm:min-w-[280px] sm:max-w-[360px] sm:shrink-0',
      'posd:w-[360px] posd:min-w-[340px] posd:max-w-[360px] xl:w-[360px]',
      'sm:flex sm:h-[calc(100vh-8.75rem)] sm:flex-col',
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
        'rounded-t-ui-lg sm:rounded-[16px]',
        'max-h-[92vh] sm:h-full sm:max-h-none',
        'mb-[calc(var(--mobile-bottom-nav-height)+var(--mobile-safe-area-bottom))] sm:mb-0',
      )}
    >
      {/* —— Phone + tablet compact header —— */}
      <div className="m-pos-cart-header posd:hidden shrink-0 border-b border-[var(--line)] px-3 pt-2 pb-2.5">
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
        <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
          <div className="min-w-0">
            <p className="m-pos-cart-meta text-[15px] font-bold tabular-nums leading-tight text-[var(--brand)]">
              {clockLabel}
            </p>
            <p className="mt-0.5 text-[12px] font-medium tabular-nums text-[var(--text-muted)]">
              {dateLabel}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">{headerRight}</div>
        </div>
        <h3 className="m-pos-cart-title px-4 pb-3 text-[18px] font-bold leading-tight text-[var(--text-primary)]">
          Order Summary
        </h3>
      </div>

      <div className="m-pos-cart-body min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5 scrollbar-thin posd:space-y-2 posd:px-4 posd:py-3">
        {children}
      </div>
      <div className="m-pos-cart-footer flex shrink-0 flex-col gap-2.5 border-t border-[var(--line)] bg-[var(--bg-surface)] p-3 pb-[max(0.75rem,var(--safe-bottom))] posd:gap-3 posd:p-4 posd:pb-[max(1rem,var(--safe-bottom))]">
        {footer}
      </div>
    </div>
  </aside>
);

export default POSCartSheet;
