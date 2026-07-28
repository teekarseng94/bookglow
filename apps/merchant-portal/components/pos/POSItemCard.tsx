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
 * Compact catalogue card: thumbnail + name/meta, footer row with price | +.
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
  const [imgError, setImgError] = React.useState(false);
  const showImage = !!imageUrl && !imgError;

  const addButton = (sizeClassName: string) => (
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Add ${name}`}
      className={cx(
        'inline-flex items-center justify-center rounded-full',
        'bg-[var(--brand)] text-white shadow-ui-xs',
        'hover:opacity-90 active:scale-95 transition-all',
        'focus-visible:shadow-ui-focus-strong',
        sizeClassName,
      )}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );

  return (
    <div className={cx('relative', className)}>
      {badge ? <div className="absolute top-2 right-2 z-[1]">{badge}</div> : null}

      {/* Mobile (<640px): full-width horizontal row — media | details | price/action */}
      <div className="sm:hidden m-pos-mobile-card flex items-center bg-[var(--bg-surface)] border border-[var(--line)]">
        <div className="m-pos-mobile-card__thumb shrink-0 overflow-hidden bg-[var(--brand-soft)] flex items-center justify-center">
          {showImage ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <span className="text-lg font-bold text-[var(--brand)]">{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-pos-mobile-card__title text-[var(--text-primary)] leading-snug line-clamp-2">{name}</p>
          {metaLeft || metaRight ? (
            <div className="flex items-center gap-2 mt-0.5">
              {metaLeft ? (
                <span className="m-pos-mobile-card__meta text-[var(--text-muted)] truncate">{metaLeft}</span>
              ) : null}
              {metaRight ? (
                <span className="m-pos-mobile-card__meta font-semibold text-amber-600 truncate">{metaRight}</span>
              ) : null}
            </div>
          ) : null}
          {chips}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="m-pos-mobile-card__price text-emerald-600 tabular-nums">{priceLabel}</span>
          {addButton('m-pos-mobile-card__add')}
        </div>
      </div>

      {/* Tablet/desktop (>=640px): existing tile layout, unchanged */}
      <div
        className={cx(
          'hidden sm:flex bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)]',
          'p-3.5 hover:border-[var(--brand)] hover:shadow-ui-sm transition-all',
          'flex-col gap-3 h-full min-h-[132px]',
          'm-service-card md:min-h-[132px]',
        )}
      >
        <div className="flex gap-3 min-w-0 flex-1">
          <div className="m-service-thumb w-14 h-14 sm:w-16 sm:h-16 rounded-ui-sm overflow-hidden shrink-0 bg-[var(--brand-soft)] flex items-center justify-center">
            {showImage ? (
              <img src={imageUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
            ) : (
              <span className="text-lg font-bold text-[var(--brand)]">{initial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="m-list-title text-sm font-bold text-[var(--text-primary)] leading-snug line-clamp-2 md:text-sm">{name}</p>
            {metaLeft ? (
              <p className="m-secondary text-xs text-[var(--text-muted)] mt-0.5 truncate md:text-xs">{metaLeft}</p>
            ) : null}
            {metaRight ? (
              <p className="m-caption font-semibold text-amber-600 mt-0.5">{metaRight}</p>
            ) : null}
            {chips}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="m-pos-price text-base font-bold text-emerald-600 tabular-nums">{priceLabel}</span>
          {addButton('m-pos-add-btn w-10 h-10 min-w-[40px] min-h-[40px]')}
        </div>
      </div>
    </div>
  );
};

export default POSItemCard;
