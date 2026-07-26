import React from 'react';
import { cx } from '../ui/cx';

export interface POSItemCardProps {
  name: string;
  priceLabel: string;
  metaLeft?: React.ReactNode;
  metaRight?: React.ReactNode;
  chips?: React.ReactNode;
  imageUrl?: string;
  badge?: React.ReactNode;
  onAdd: () => void;
  accent?: 'brand' | 'amber' | 'indigo';
  className?: string;
}

/**
 * Compact catalogue card: thumbnail + name/meta/price + add control.
 */
export const POSItemCard: React.FC<POSItemCardProps> = ({
  name,
  priceLabel,
  metaLeft,
  metaRight,
  chips,
  imageUrl,
  badge,
  onAdd,
  className,
}) => {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <div
      className={cx(
        'relative bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)]',
        'p-3 hover:border-[var(--brand)] hover:shadow-ui-sm transition-all',
        'flex flex-col gap-2 min-h-[108px]',
        className,
      )}
    >
      {badge ? <div className="absolute top-2 right-2 z-[1]">{badge}</div> : null}

      <div className="flex gap-3 min-w-0">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-ui-sm overflow-hidden shrink-0 bg-[var(--brand-soft)] flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-base font-bold text-[var(--brand)]">{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--text-primary)] leading-snug line-clamp-2">{name}</p>
          {metaLeft ? (
            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{metaLeft}</p>
          ) : null}
          <p className="text-sm font-bold text-emerald-600 tabular-nums mt-1">{priceLabel}</p>
          {metaRight ? (
            <p className="text-[10px] font-semibold text-amber-600 mt-0.5">{metaRight}</p>
          ) : null}
          {chips}
        </div>
      </div>

      <div className="mt-auto flex justify-end">
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add ${name}`}
          className={cx(
            'inline-flex items-center justify-center w-8 h-8 rounded-full',
            'bg-[var(--brand)] text-white shadow-ui-xs',
            'hover:opacity-90 active:scale-95 transition-all',
            'focus-visible:shadow-ui-focus-strong',
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default POSItemCard;
