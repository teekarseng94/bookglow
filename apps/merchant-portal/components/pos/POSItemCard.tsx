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
 * Phone (<640): full-width readable row.
 * Tablet (640–1199): compact horizontal card in the split catalogue grid.
 * Desktop (1200+): existing desktop card layout.
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
  const displayName = (name || '').replace(/\s+/g, ' ').trim();

  const addButton = (sizeClassName: string, variant: 'outline' | 'tablet-filled' = 'outline') => (
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Add ${name}`}
      className={cx(
        'inline-flex items-center justify-center rounded-full transition-all',
        'focus-visible:shadow-ui-focus-strong active:scale-95',
        variant === 'tablet-filled'
          ? 'border border-[var(--brand-soft)] bg-[var(--bg-surface)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white sm:border-[var(--brand)] sm:bg-[var(--brand)] sm:text-white sm:hover:opacity-90'
          : 'border border-[var(--brand-soft)] bg-[var(--bg-surface)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white',
        sizeClassName,
      )}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );

  const thumb = (
    <>
      {showImage ? (
        <img src={imageUrl} alt="" className="h-full w-full object-cover" onError={() => setImgError(true)} />
      ) : (
        <span className="text-lg font-bold text-[var(--brand)]">{initial}</span>
      )}
    </>
  );

  return (
    <div className={cx('relative h-full', className)}>
      {badge ? <div className="absolute right-2 top-2 z-[1]">{badge}</div> : null}

      {/* Phone + tablet horizontal card */}
      <div
        className={cx(
          'm-pos-mobile-card m-card m-card-interactive flex h-full items-center gap-3 border border-[var(--line)] bg-[var(--bg-surface)]',
          'rounded-ui-md p-3 min-h-[96px]',
          'sm:min-h-[88px] sm:gap-2.5 sm:p-2.5 sm:shadow-ui-xs',
          'posd:hidden',
        )}
      >
        <div className="m-pos-mobile-card__thumb flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--brand-soft)] sm:h-[52px] sm:w-[52px]">
          {thumb}
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-pos-mobile-card__title whitespace-normal break-words text-[15px] font-semibold leading-snug text-[var(--text-primary)] sm:text-[13px] sm:font-bold">
            {displayName}
          </p>
          {metaLeft || metaRight ? (
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              {metaLeft ? (
                <span className="m-pos-mobile-card__meta truncate text-[12px] text-[var(--text-muted)] sm:text-[11px]">
                  {metaLeft}
                </span>
              ) : null}
              {metaRight ? (
                <span className="m-pos-mobile-card__meta truncate text-[12px] font-semibold text-[var(--warning)] sm:text-[11px]">
                  {metaRight}
                </span>
              ) : null}
            </div>
          ) : null}
          {chips}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 pl-1 sm:gap-1">
          <span className="m-pos-mobile-card__price text-[14px] font-semibold tabular-nums text-[var(--success)] sm:text-[13px] sm:font-bold">
            {priceLabel}
          </span>
          {addButton(
            'm-pos-mobile-card__add h-10 w-10 min-h-[40px] min-w-[40px] sm:h-8 sm:w-8 sm:min-h-[32px] sm:min-w-[32px]',
            'tablet-filled',
          )}
        </div>
      </div>

      {/* Desktop (1200+) */}
      <div
        className={cx(
          'hidden h-full items-stretch posd:flex',
          'rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)]',
          'transition-all hover:border-[var(--brand)] hover:shadow-ui-sm',
          'min-h-[104px] gap-4 p-4',
        )}
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center self-center overflow-hidden rounded-xl bg-[var(--brand-soft)]">
          {thumb}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <p className="w-full whitespace-normal break-words text-[15px] font-semibold leading-snug text-[var(--text-primary)]">
            {displayName}
          </p>
          {metaLeft ? (
            <p className="truncate text-[13px] leading-snug text-[var(--text-muted)]">{metaLeft}</p>
          ) : null}
          {metaRight ? (
            <p className="truncate text-[12px] font-semibold leading-snug text-[var(--warning)]">{metaRight}</p>
          ) : null}
          {chips}
          <div className="mt-1 flex min-w-0 items-center justify-between gap-3">
            <span className="min-w-0 truncate text-lg font-semibold leading-none tabular-nums text-[var(--success)]">
              {priceLabel}
            </span>
            {addButton('h-11 w-11 min-h-[44px] min-w-[44px] shrink-0')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSItemCard;
