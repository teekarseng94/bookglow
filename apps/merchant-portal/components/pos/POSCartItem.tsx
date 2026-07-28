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
  const staffPhoto = selectedStaff?.photoURL || selectedStaff?.profilePicture;
  const staffInitial = (selectedStaff?.name || 'A').trim().charAt(0).toUpperCase();

  return (
    <div
      className={cx(
        'm-pos-cart-item bg-[var(--bg-surface)] px-2.5 py-2.5 rounded-ui-md border border-[var(--line)] animate-fadeIn',
        className,
      )}
    >
      {/* Row 1: thumb | name/meta | price | remove */}
      <div className="flex items-start gap-2.5">
        <div className="m-pos-cart-item__thumb w-10 h-10 rounded-ui-sm overflow-hidden shrink-0 bg-[var(--brand-soft)] flex items-center justify-center">
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
              'm-pos-cart-item__price font-bold text-sm tabular-nums pt-0.5 text-emerald-600',
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

      {/* Row 2: qty | staff (inline, wraps cleanly) */}
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
              <label htmlFor={`pos-staff-${displayName.replace(/\s+/g, '-')}`} className="sr-only">
                Assign staff for {displayName}
              </label>
              <div
                className={cx(
                  'pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 z-[1]',
                  'w-6 h-6 rounded-full overflow-hidden flex items-center justify-center m-caption font-bold',
                  selectedStaff
                    ? 'bg-[var(--brand-soft)] text-[var(--brand)]'
                    : 'bg-[var(--bg-soft)] text-[var(--text-muted)]',
                )}
                aria-hidden
              >
                {staffPhoto ? (
                  <img src={staffPhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  staffInitial
                )}
              </div>
              <select
                id={`pos-staff-${displayName.replace(/\s+/g, '-')}`}
                className={cx(
                  'm-pos-control w-full min-h-[44px] h-11 pl-9 pr-7 text-sm rounded-ui-sm border outline-none font-semibold appearance-none',
                  'bg-[var(--bg-soft)] focus-visible:shadow-ui-focus-strong truncate',
                  selectedStaff
                    ? 'border-[var(--line)] text-[var(--text-primary)]'
                    : 'border-rose-200 text-rose-600 bg-rose-50',
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
  );
};

export default POSCartItem;
