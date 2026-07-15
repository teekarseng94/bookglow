import React from 'react';
import { cx } from '../ui/cx';

export interface POSItemCardProps {
  name: string;
  priceLabel: string;
  metaLeft?: React.ReactNode;
  metaRight?: React.ReactNode;
  chips?: React.ReactNode;
  onAdd: () => void;
  accent?: 'brand' | 'amber' | 'indigo';
  className?: string;
}

const accentHover: Record<NonNullable<POSItemCardProps['accent']>, string> = {
  brand: 'hover:border-[var(--brand)]',
  amber: 'hover:border-amber-500',
  indigo: 'hover:border-indigo-500',
};

export const POSItemCard: React.FC<POSItemCardProps> = ({
  name,
  priceLabel,
  metaLeft,
  metaRight,
  chips,
  onAdd,
  accent = 'brand',
  className,
}) => (
  <button
    type="button"
    onClick={onAdd}
    className={cx(
      'bg-[var(--bg-surface)] p-3 md:p-4 rounded-ui-md border border-[var(--line)] hover:shadow-ui-sm transition-all text-left w-full',
      accentHover[accent],
      className,
    )}
  >
    <div className="flex justify-between items-start gap-2 mb-2">
      <span className="font-bold text-[var(--text-primary)] leading-tight">{name}</span>
      <span className="text-emerald-600 font-black text-sm tabular-nums shrink-0">{priceLabel}</span>
    </div>
    {chips}
    {(metaLeft || metaRight) && (
      <div className="flex items-center justify-between mt-2 text-[8px] md:text-[9px] font-black text-[var(--text-muted)] uppercase">
        <span>{metaLeft}</span>
        <span className="text-amber-500">{metaRight}</span>
      </div>
    )}
  </button>
);

export default POSItemCard;
