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
  const showQty = typeof quantity === 'number' && Boolean(onQuantityChange);

  return (
    <div
      className={cx(
        'm-pos-cart-item min-w-0 bg-[var(--bg-surface)] animate-fadeIn',
        'border-b border-[var(--line)] py-2 last:border-b-0',
        'sm:mb-2 sm:rounded-ui-md sm:border sm:border-[var(--line)] sm:p-2.5 sm:last:border-b sm:shadow-ui-xs',
        'posd:mb-0 posd:rounded-none posd:border-0 posd:border-b posd:border-[var(--line)] posd:p-0 posd:py-3 posd:shadow-none posd:last:border-b',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2 posd:gap-2.5">
        <div
          className="m-pos-cart-item__qty-badge flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--brand-soft)] text-xs font-bold tabular-nums text-[var(--brand)]"
          aria-hidden
        >
          {showQty ? quantity : initial}
        </div>

        <div className="m-pos-cart-item__thumb hidden h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--brand-soft)] sm:flex posd:hidden">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-[var(--brand)]">{initial}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-1.5">
            <div className="min-w-0 flex-1">
              <p className="m-pos-cart-item__name line-clamp-2 text-[13px] font-bold leading-snug text-[var(--text-primary)] posd:truncate posd:whitespace-nowrap posd:text-sm">
                {displayName}
              </p>
              {meta ? (
                <div className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)] posd:text-xs">{meta}</div>
              ) : null}
              {qtyPriceLabel ? (
                <div className="mt-0.5 hidden text-xs font-medium text-[var(--text-muted)] posd:block">{qtyPriceLabel}</div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-start gap-0.5">
              <span
                className={cx(
                  'm-pos-cart-item__price pt-0.5 text-[13px] font-bold tabular-nums posd:text-sm',
                  lineTotalEmphasized ? 'text-[var(--success)]' : 'text-[var(--success)] posd:text-[var(--text-primary)]',
                )}
              >
                {lineTotalLabel}
              </span>
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] focus-visible:shadow-ui-focus-strong posd:h-7 posd:w-7"
                aria-label="Remove item"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {showQty || showStaffSelector ? (
            <div className="m-pos-cart-item__controls mt-2 grid min-w-0 grid-cols-1 items-stretch gap-2 posd:grid-cols-[auto_minmax(0,1fr)] posd:items-center">
              {showQty && onQuantityChange ? (
                <div className="inline-flex h-11 w-fit shrink-0 items-center overflow-hidden rounded-md border border-[var(--line)] bg-[var(--bg-surface)] posd:h-9 posd:rounded-ui-sm posd:bg-[var(--bg-soft)]">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    className="m-pos-cart-item__qty-btn inline-flex h-11 w-11 items-center justify-center text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] focus-visible:shadow-ui-focus-strong posd:h-9 posd:w-9"
                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-sm font-bold tabular-nums posd:w-8">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    className="m-pos-cart-item__qty-btn inline-flex h-11 w-11 items-center justify-center text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] focus-visible:shadow-ui-focus-strong posd:h-9 posd:w-9"
                    onClick={() => onQuantityChange(quantity + 1)}
                  >
                    +
                  </button>
                </div>
              ) : null}

              {showStaffSelector && onStaffChange ? (
                <div className={cx('relative min-w-0 max-w-full', !showQty && 'posd:col-span-2')}>
                  <label htmlFor={staffSelectId} className="sr-only">
                    Assign staff for {displayName}
                  </label>
                  <svg
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <select
                    id={staffSelectId}
                    aria-label={`Assign staff for ${displayName}`}
                    className={cx(
                      'm-pos-control box-border h-11 min-h-[44px] w-full min-w-0 max-w-full appearance-none truncate rounded-md border bg-[var(--bg-surface)] pl-8 pr-8 text-sm font-semibold outline-none',
                      'focus-visible:shadow-ui-focus-strong posd:h-11 posd:rounded-ui-sm posd:bg-[var(--bg-soft)]',
                      selectedStaff
                        ? 'border-[var(--line)] text-[var(--text-primary)]'
                        : 'border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]',
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
                    className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]"
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
    </div>
  );
};

export default POSCartItem;
