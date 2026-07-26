import React from 'react';
import { Icons } from '../../constants';
import { cx } from '../ui/cx';

export interface POSCartItemProps {
  displayName: string;
  qtyPriceLabel: React.ReactNode;
  lineTotalLabel: string;
  lineTotalEmphasized?: boolean;
  quantity?: number;
  onQuantityChange?: (next: number) => void;
  onRemove: () => void;
  redeemControl?: React.ReactNode;
  staffControl?: React.ReactNode;
  meta?: React.ReactNode;
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
  staffControl,
  meta,
  className,
}) => (
  <div
    className={cx(
      'bg-[var(--bg-soft)]/50 p-3 rounded-ui-md border border-[var(--line)] animate-fadeIn relative',
      className,
    )}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[var(--text-primary)] leading-snug">{displayName}</p>
        {meta ? <div className="text-xs text-[var(--text-muted)] mt-0.5">{meta}</div> : null}
        <div className="text-xs text-[var(--text-muted)] font-medium mt-0.5">{qtyPriceLabel}</div>
      </div>
      <div className="flex items-start gap-1.5 shrink-0">
        <span
          className={cx(
            'font-bold text-sm tabular-nums pt-0.5',
            lineTotalEmphasized ? 'text-emerald-600' : 'text-[var(--text-primary)]',
          )}
        >
          {lineTotalLabel}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="w-7 h-7 inline-flex items-center justify-center rounded-ui-sm text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]"
          aria-label="Remove item"
        >
          <Icons.Trash />
        </button>
      </div>
    </div>

    {typeof quantity === 'number' && onQuantityChange ? (
      <div className="mt-2 inline-flex items-center rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)] overflow-hidden">
        <button
          type="button"
          aria-label="Decrease quantity"
          className="w-8 h-8 text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] font-bold"
          onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-bold tabular-nums">{quantity}</span>
        <button
          type="button"
          aria-label="Increase quantity"
          className="w-8 h-8 text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] font-bold"
          onClick={() => onQuantityChange(quantity + 1)}
        >
          +
        </button>
      </div>
    ) : null}

    {redeemControl}
    {staffControl}
  </div>
);

export default POSCartItem;
