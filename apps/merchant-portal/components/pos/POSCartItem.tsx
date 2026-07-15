import React from 'react';
import { Icons } from '../../constants';
import { cx } from '../ui/cx';

export interface POSCartItemProps {
  displayName: string;
  qtyPriceLabel: React.ReactNode;
  lineTotalLabel: string;
  lineTotalEmphasized?: boolean;
  onRemove: () => void;
  redeemControl?: React.ReactNode;
  staffControl?: React.ReactNode;
  className?: string;
}

export const POSCartItem: React.FC<POSCartItemProps> = ({
  displayName,
  qtyPriceLabel,
  lineTotalLabel,
  lineTotalEmphasized,
  onRemove,
  redeemControl,
  staffControl,
  className,
}) => (
  <div
    className={cx(
      'bg-[var(--bg-surface)] p-2.5 rounded-ui-md border border-[var(--line)] animate-fadeIn relative group shadow-ui-xs',
      className,
    )}
  >
    <button
      type="button"
      onClick={onRemove}
      className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
      aria-label="Remove item"
    >
      <Icons.Trash />
    </button>
    <div className="flex justify-between items-start mb-1.5">
      <div className="flex-1 pr-2 min-w-0">
        <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">{displayName}</p>
        <div className="text-xs text-[var(--text-muted)] font-bold uppercase mt-0.5">{qtyPriceLabel}</div>
      </div>
      <span
        className={cx(
          'font-black text-sm shrink-0 tabular-nums',
          lineTotalEmphasized ? 'text-emerald-600' : 'text-[var(--text-primary)]',
        )}
      >
        {lineTotalLabel}
      </span>
    </div>
    {redeemControl}
    {staffControl}
  </div>
);

export default POSCartItem;
