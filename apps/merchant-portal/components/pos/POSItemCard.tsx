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
 * Catalogue card.
 * Mobile: existing full-width row.
 * Desktop: [64 thumb] [title → duration → points → price] [+ aligned to price].
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
  // Collapse newlines / extra spaces so short titles stay on one line when width allows
  const displayName = (name || '').replace(/\s+/g, ' ').trim();

  const addButton = (sizeClassName: string) => (
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Add ${name}`}
      className={cx(
        'inline-flex items-center justify-center rounded-full',
        'border border-[var(--brand-soft)] bg-[var(--bg-surface)] text-[var(--brand)]',
        'hover:bg-[var(--brand)] hover:text-white active:scale-95 transition-all',
        'focus-visible:shadow-ui-focus-strong',
        sizeClassName,
      )}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );

  const thumb = (
    <>
      {showImage ? (
        <img src={imageUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
      ) : (
        <span className="text-lg font-bold text-[var(--brand)]">{initial}</span>
      )}
    </>
  );

  return (
    <div className={cx('relative', className)}>
      {badge ? <div className="absolute top-2 right-2 z-[1]">{badge}</div> : null}

      {/* Mobile (<640px): full-width horizontal row — media | details | price/action */}
      <div className="sm:hidden m-pos-mobile-card flex items-center bg-[var(--bg-surface)] border border-[var(--line)]">
        <div className="m-pos-mobile-card__thumb shrink-0 overflow-hidden bg-[var(--brand-soft)] flex items-center justify-center">
          {thumb}
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-pos-mobile-card__title text-[var(--text-primary)] leading-snug whitespace-normal break-words">
            {displayName}
          </p>
          {metaLeft || metaRight ? (
            <div className="flex items-center gap-2 mt-0.5">
              {metaLeft ? (
                <span className="m-pos-mobile-card__meta text-[var(--text-muted)] truncate">{metaLeft}</span>
              ) : null}
              {metaRight ? (
                <span className="m-pos-mobile-card__meta font-semibold text-[var(--warning)] truncate">{metaRight}</span>
              ) : null}
            </div>
          ) : null}
          {chips}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="m-pos-mobile-card__price text-[var(--success)] tabular-nums">{priceLabel}</span>
          {addButton('m-pos-mobile-card__add')}
        </div>
      </div>

      {/* Desktop/tablet: thumb | content (title uses full width); price + add share bottom row */}
      <div
        className={cx(
          'hidden sm:flex items-stretch',
          'bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)]',
          'hover:border-[var(--brand)] hover:shadow-ui-sm transition-all',
          'p-2.5 gap-3 min-h-[88px] h-full',
        )}
      >
        <div className="w-16 h-16 rounded-ui-sm overflow-hidden shrink-0 self-center bg-[var(--brand-soft)] flex items-center justify-center">
          {thumb}
        </div>

        <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
          <p className="w-full text-[13px] font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">
            {displayName}
          </p>
          {metaLeft ? (
            <p className="text-[11px] text-[var(--text-muted)] leading-snug truncate">{metaLeft}</p>
          ) : null}
          {metaRight ? (
            <p className="text-[10px] font-semibold text-[var(--warning)] leading-snug truncate">{metaRight}</p>
          ) : null}
          {chips}
          <div className="mt-1 flex items-center justify-between gap-3 min-w-0">
            <span className="min-w-0 text-[13px] font-bold text-[var(--success)] tabular-nums leading-none truncate">
              {priceLabel}
            </span>
            {addButton('w-7 h-7 min-w-[28px] min-h-[28px] shrink-0')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSItemCard;
