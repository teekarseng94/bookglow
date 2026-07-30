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
  /** Inline staff selector (services). Prefer this over a separate full-width block. */
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
        'py-2 border-b border-[var(--line)] last:border-b-0',
        'lg:py-3 lg:border-b-0',
        className,
      )}
    >
      {/* —— Mobile row (mockup): qty badge | name/duration | price | remove —— */}
      <div className="lg:hidden flex items-start gap-2">
        <div
          className="m-pos-cart-item__qty-badge w-7 h-7 rounded-md bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center shrink-0 text-xs font-bold tabular-nums"
          aria-hidden
        >
          {typeof quantity === 'number' ? quantity : initial}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <div className="min-w-0 flex-1">
              <p className="m-pos-cart-item__name text-[13px] font-bold text-[var(--text-primary)] leading-snug line-clamp-2">
                {displayName}
              </p>
              {meta ? (
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{meta}</div>
              ) : null}
            </div>
            <div className="flex items-start gap-0.5 shrink-0">
              <span
                className={cx(
                  'm-pos-cart-item__price text-[13px] font-bold tabular-nums text-[var(--success)] pt-0.5',
                  lineTotalEmphasized && 'opacity-90',
                )}
              >
                {lineTotalLabel}
              </span>
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] focus-visible:shadow-ui-focus-strong"
                aria-label="Remove item"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Compact qty + staff on one row */}
          {(typeof quantity === 'number' && onQuantityChange) || showStaffSelector ? (
            <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
              {typeof quantity === 'number' && onQuantityChange ? (
                <div className="inline-flex items-center h-7 rounded-md border border-[var(--line)] bg-[var(--bg-surface)] overflow-hidden shrink-0">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    className="w-7 h-7 inline-flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] text-sm font-bold focus-visible:shadow-ui-focus-strong"
                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-xs font-bold tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    className="w-7 h-7 inline-flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] text-sm font-bold focus-visible:shadow-ui-focus-strong"
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
                    className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]"
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
                      'w-full h-7 pl-7 pr-6 text-[11px] rounded-md border outline-none font-semibold appearance-none',
                      'bg-[var(--bg-surface)] focus-visible:shadow-ui-focus-strong truncate',
                      selectedStaff
                        ? 'border-[var(--line)] text-[var(--text-primary)]'
                        : 'border-[var(--danger)]/25 text-[var(--danger)] bg-[var(--danger-soft)]',
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
                    className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)]"
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

      {/* —— Desktop row (preserved) —— */}
      <div className="hidden lg:block">
        <div className="flex items-start gap-2.5">
          <div className="m-pos-cart-item__thumb w-11 h-11 rounded-ui-sm overflow-hidden shrink-0 bg-[var(--brand-soft)] flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-[var(--brand)]">{initial}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="m-pos-cart-item__name text-sm font-bold text-[var(--text-primary)] leading-snug line-clamp-2">
              {displayName}
            </p>
            {meta ? <div className="text-xs text-[var(--text-muted)] mt-0.5">{meta}</div> : null}
            {qtyPriceLabel ? (
              <div className="text-xs text-[var(--text-muted)] font-medium mt-0.5">{qtyPriceLabel}</div>
            ) : null}
          </div>

          <div className="flex items-start gap-0.5 shrink-0">
            <span
              className={cx(
                'm-pos-cart-item__price font-bold text-sm tabular-nums pt-0.5 text-[var(--success)]',
                lineTotalEmphasized && 'opacity-90',
              )}
            >
              {lineTotalLabel}
            </span>
            <button
              type="button"
              onClick={onRemove}
              className="m-pos-cart-item__qty-btn inline-flex items-center justify-center rounded-ui-sm text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] focus-visible:shadow-ui-focus-strong"
              aria-label="Remove item"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {(typeof quantity === 'number' && onQuantityChange) || showStaffSelector ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 pl-[2.75rem]">
            {typeof quantity === 'number' && onQuantityChange ? (
              <div className="inline-flex items-center rounded-ui-sm border border-[var(--line)] bg-[var(--bg-soft)] overflow-hidden">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  className="m-pos-cart-item__qty-btn text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] font-bold focus-visible:shadow-ui-focus-strong"
                  onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-bold tabular-nums">{quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  className="m-pos-cart-item__qty-btn text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] font-bold focus-visible:shadow-ui-focus-strong"
                  onClick={() => onQuantityChange(quantity + 1)}
                >
                  +
                </button>
              </div>
            ) : null}

            {showStaffSelector && onStaffChange ? (
              <div className="relative min-w-0 flex-1 sm:flex-none sm:min-w-[148px] max-w-full">
                <label htmlFor={`${staffSelectId}-desktop`} className="sr-only">
                  Assign staff for {displayName}
                </label>
                <select
                  id={`${staffSelectId}-desktop`}
                  className={cx(
                    'm-pos-control w-full min-h-[44px] h-11 pl-3 pr-7 text-sm rounded-ui-sm border outline-none font-semibold appearance-none',
                    'bg-[var(--bg-soft)] focus-visible:shadow-ui-focus-strong truncate',
                    selectedStaff
                      ? 'border-[var(--line)] text-[var(--text-primary)]'
                      : 'border-[var(--danger)]/20 text-[var(--danger)] bg-[var(--danger-soft)]',
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
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]"
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
