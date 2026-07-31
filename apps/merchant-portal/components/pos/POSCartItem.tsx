import React from 'react';
import { cx } from '../ui/cx';

export interface POSCartStaffOption {
  id: string;
  name: string;
  photoURL?: string;
  profilePicture?: string;
}

export interface POSCartItemProps {
  displayName: string;
  qtyPriceLabel?: React.ReactNode;
  lineTotalLabel: string;
  lineTotalEmphasized?: boolean;
  quantity?: number;
  onQuantityChange?: (next: number) => void;
  onRemove: () => void;
  redeemControl?: React.ReactNode;
  meta?: React.ReactNode;
  imageUrl?: string;
  showStaffSelector?: boolean;
  staffId?: string;
  staffOptions?: POSCartStaffOption[];
  onStaffChange?: (staffId: string) => void;
  className?: string;
}

export const POSCartItem: React.FC<POSCartItemProps> = ({
  displayName,
  qtyPriceLabel,
  lineTotalLabel,
  lineTotalEmphasized,
  quantity,
  onQuantityChange,
  onRemove,
  redeemControl,
  meta,
  imageUrl,
  showStaffSelector,
  staffId,
  staffOptions = [],
  onStaffChange,
  className,
}) => {
  const initial = (displayName || '?').trim().charAt(0).toUpperCase() || '?';
  const selectedStaff = staffId ? staffOptions.find((s) => s.id === staffId) : undefined;
  const staffSelectId = `pos-staff-${displayName.replace(/\s+/g, '-')}-${quantity ?? 0}`;

  return (
    <div
      className={cx(
        'm-pos-cart-item bg-[var(--bg-surface)] animate-fadeIn',
        'border-b border-[var(--line)] py-2 last:border-b-0',
        /* Tablet: card-like rows in the persistent rail */
        'sm:mb-2 sm:rounded-ui-md sm:border sm:border-[var(--line)] sm:p-2.5 sm:last:border-b sm:shadow-ui-xs',
        'posd:mb-0 posd:rounded-none posd:border-0 posd:border-b-0 posd:p-0 posd:py-3 posd:shadow-none',
        className,
      )}
    >
      {/* —— Phone + tablet compact row —— */}
      <div className="flex items-start gap-2 posd:hidden">
        <div
          className="m-pos-cart-item__qty-badge flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--brand-soft)] text-xs font-bold tabular-nums text-[var(--brand)]"
          aria-hidden
        >
          {typeof quantity === 'number' ? quantity : initial}
        </div>

        {/* Tablet: small service thumb beside qty */}
        <div className="hidden h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--brand-soft)] sm:flex posd:hidden">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-[var(--brand)]">{initial}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <div className="min-w-0 flex-1">
              <p className="m-pos-cart-item__name line-clamp-2 text-[13px] font-bold leading-snug text-[var(--text-primary)]">
                {displayName}
              </p>
              {meta ? (
                <div className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">{meta}</div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-start gap-0.5">
              <span
                className={cx(
                  'm-pos-cart-item__price pt-0.5 text-[13px] font-bold tabular-nums text-[var(--success)]',
                  lineTotalEmphasized && 'opacity-90',
                )}
              >
                {lineTotalLabel}
              </span>
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] focus-visible:shadow-ui-focus-strong"
                aria-label="Remove item"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {(typeof quantity === 'number' && onQuantityChange) || showStaffSelector ? (
            <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
              {typeof quantity === 'number' && onQuantityChange ? (
                <div className="inline-flex h-7 shrink-0 items-center overflow-hidden rounded-md border border-[var(--line)] bg-[var(--bg-surface)]">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    className="inline-flex h-7 w-7 items-center justify-center text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] focus-visible:shadow-ui-focus-strong"
                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-xs font-bold tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    className="inline-flex h-7 w-7 items-center justify-center text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] focus-visible:shadow-ui-focus-strong"
                    onClick={() => onQuantityChange(quantity + 1)}
                  >
                    +
                  </button>
                </div>
              ) : null}

              {showStaffSelector && onStaffChange ? (
                <div className="relative min-w-0 flex-1">
                  <label htmlFor={staffSelectId} className="sr-only">
                    Assign staff for {displayName}
                  </label>
                  <svg
                    className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <select
                    id={staffSelectId}
                    className={cx(
                      'h-7 w-full truncate appearance-none rounded-md border bg-[var(--bg-surface)] pl-7 pr-6 text-[11px] font-semibold outline-none',
                      'focus-visible:shadow-ui-focus-strong',
                      selectedStaff
                        ? 'border-[var(--line)] text-[var(--text-primary)]'
                        : 'border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]',
                    )}
                    value={staffId || ''}
                    onChange={(e) => onStaffChange(e.target.value)}
                  >
                    <option value="">Staff</option>
                    {staffOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--text-muted)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              ) : null}
            </div>
          ) : null}

          {redeemControl}
        </div>
      </div>

      {/* —— Desktop row (1200+) —— */}
      <div className="hidden posd:block">
        <div className="flex items-start gap-2.5">
          <div className="m-pos-cart-item__thumb flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-ui-sm bg-[var(--brand-soft)]">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-[var(--brand)]">{initial}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="m-pos-cart-item__name line-clamp-2 text-sm font-bold leading-snug text-[var(--text-primary)]">
              {displayName}
            </p>
            {meta ? <div className="mt-0.5 text-xs text-[var(--text-muted)]">{meta}</div> : null}
            {qtyPriceLabel ? (
              <div className="mt-0.5 text-xs font-medium text-[var(--text-muted)]">{qtyPriceLabel}</div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-start gap-0.5">
            <span
              className={cx(
                'm-pos-cart-item__price pt-0.5 text-sm font-bold tabular-nums text-[var(--success)]',
                lineTotalEmphasized && 'opacity-90',
              )}
            >
              {lineTotalLabel}
            </span>
            <button
              type="button"
              onClick={onRemove}
              className="m-pos-cart-item__qty-btn inline-flex items-center justify-center rounded-ui-sm text-[var(--text-muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] focus-visible:shadow-ui-focus-strong"
              aria-label="Remove item"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {(typeof quantity === 'number' && onQuantityChange) || showStaffSelector ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 pl-[2.75rem]">
            {typeof quantity === 'number' && onQuantityChange ? (
              <div className="inline-flex items-center overflow-hidden rounded-ui-sm border border-[var(--line)] bg-[var(--bg-soft)]">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  className="m-pos-cart-item__qty-btn font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] focus-visible:shadow-ui-focus-strong"
                  onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-bold tabular-nums">{quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  className="m-pos-cart-item__qty-btn font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] focus-visible:shadow-ui-focus-strong"
                  onClick={() => onQuantityChange(quantity + 1)}
                >
                  +
                </button>
              </div>
            ) : null}

            {showStaffSelector && onStaffChange ? (
              <div className="relative max-w-full min-w-0 flex-1 sm:min-w-[148px] sm:flex-none">
                <label htmlFor={`${staffSelectId}-desktop`} className="sr-only">
                  Assign staff for {displayName}
                </label>
                <select
                  id={`${staffSelectId}-desktop`}
                  className={cx(
                    'm-pos-control h-11 min-h-[44px] w-full appearance-none truncate rounded-ui-sm border bg-[var(--bg-soft)] pl-3 pr-7 text-sm font-semibold outline-none',
                    'focus-visible:shadow-ui-focus-strong',
                    selectedStaff
                      ? 'border-[var(--line)] text-[var(--text-primary)]'
                      : 'border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]',
                  )}
                  value={staffId || ''}
                  onChange={(e) => onStaffChange(e.target.value)}
                >
                  <option value="">Assign staff</option>
                  {staffOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            ) : null}
          </div>
        ) : null}

        {redeemControl}
      </div>
    </div>
  );
};

export default POSCartItem;
