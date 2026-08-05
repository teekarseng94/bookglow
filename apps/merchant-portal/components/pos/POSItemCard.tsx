import React from 'react';
import { cx } from '../ui/cx';

/** Neutral Bookglow catalogue placeholder when no service/category image exists. */
const POS_PLACEHOLDER_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="224" height="128" viewBox="0 0 224 128" fill="none">
      <rect width="224" height="128" rx="12" fill="#F3F0F8"/>
      <rect x="16" y="16" width="192" height="96" rx="10" fill="#E8E2F4"/>
      <circle cx="78" cy="54" r="14" fill="#C9BBE8"/>
      <path d="M32 96L78 62L104 82L140 48L192 96H32Z" fill="#B7A6DF"/>
    </svg>`,
  );

export interface POSItemCardProps {
  name: string;
  priceLabel: string;
  metaLeft?: React.ReactNode;
  metaRight?: React.ReactNode;
  chips?: React.ReactNode;
  imageUrl?: string;
  /** Optional fallback when primary image is missing (e.g. category image). */
  fallbackImageUrl?: string;
  badge?: React.ReactNode;
  /** Quantity already in cart — shown as a small overlay badge when > 0. */
  cartQuantity?: number;
  onAdd: () => void;
  accent?: 'brand' | 'amber' | 'indigo';
  className?: string;
}

/**
 * Catalogue card.
 * Phone (<640): full-width readable row.
 * Tablet (640–1199): compact horizontal card in the split catalogue grid.
 * Desktop (1200+): compact list row matching the approved POS reference.
 */
export const POSItemCard: React.FC<POSItemCardProps> = ({
  name,
  priceLabel,
  metaLeft,
  metaRight,
  chips,
  imageUrl,
  fallbackImageUrl,
  badge,
  cartQuantity,
  onAdd,
  className,
}) => {
  const [imgError, setImgError] = React.useState(false);
  const resolvedImage = (!imgError && (imageUrl || fallbackImageUrl)) || POS_PLACEHOLDER_IMAGE;
  const displayName = (name || '').replace(/\s+/g, ' ').trim();

  React.useEffect(() => {
    setImgError(false);
  }, [imageUrl, fallbackImageUrl]);

  const handleRowActivate = () => {
    onAdd();
  };

  const handleRowKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onAdd();
    }
  };

  const addButton = (
    sizeClassName: string,
    variant: 'outline' | 'tablet-filled' | 'desktop' = 'outline',
    stopPropagation = false,
  ) => (
    <button
      type="button"
      onClick={(event) => {
        if (stopPropagation) event.stopPropagation();
        onAdd();
      }}
      aria-label={`Add ${name}`}
      className={cx(
        'inline-flex items-center justify-center transition-all',
        'focus-visible:shadow-ui-focus-strong active:scale-95',
        variant === 'tablet-filled'
          ? 'rounded-full border border-[var(--brand-soft)] bg-[var(--bg-surface)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white sm:border-[var(--brand)] sm:bg-[var(--brand)] sm:text-white sm:hover:opacity-90'
          : variant === 'desktop'
            ? 'rounded-[11px] border border-[var(--brand-soft)] bg-[var(--brand-soft)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white'
            : 'rounded-xl border border-[var(--brand-soft)] bg-[var(--brand-soft)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white',
        sizeClassName,
      )}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );

  const qtyBadge =
    typeof cartQuantity === 'number' && cartQuantity > 0 ? (
      <span className="absolute -left-1 -top-1 z-[1] inline-flex h-5 min-w-[20px] items-center justify-center rounded-md bg-[var(--brand)] px-1 text-[11px] font-bold tabular-nums text-white shadow-ui-xs">
        {cartQuantity}
      </span>
    ) : null;

  const thumb = (
    <img
      src={resolvedImage}
      alt=""
      className="h-full w-full object-cover"
      onError={() => {
        if (!imgError && (imageUrl || fallbackImageUrl)) setImgError(true);
      }}
    />
  );

  return (
    <div className={cx('relative', className)}>
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
        <div className="relative shrink-0">
          {qtyBadge}
          <div className="m-pos-mobile-card__thumb flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-[var(--bg-soft)] sm:h-[52px] sm:w-[52px]">
            {thumb}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-pos-mobile-card__title whitespace-normal break-words text-[15px] font-semibold leading-snug text-[var(--text-primary)] sm:text-[13px] sm:font-bold">
            {displayName}
          </p>
          {metaLeft || metaRight ? (
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
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
          <span className="m-pos-mobile-card__price text-[14px] font-semibold tabular-nums text-[var(--text-primary)] sm:text-[13px] sm:font-bold">
            {priceLabel}
          </span>
          {addButton(
            'm-pos-mobile-card__add h-10 w-10 min-h-[40px] min-w-[40px] sm:h-8 sm:w-8 sm:min-h-[32px] sm:min-w-[32px]',
            'tablet-filled',
          )}
        </div>
      </div>

      {/* Desktop (1200+) — approved list row */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Add ${name}`}
        title={displayName}
        onClick={handleRowActivate}
        onKeyDown={handleRowKeyDown}
        className={cx(
          'm-pos-desktop-row hidden cursor-pointer posd:grid',
          'h-[78px] min-h-[72px] max-h-[82px] items-center gap-3.5 rounded-[13px] border border-[var(--line)] bg-[var(--bg-surface)] px-3 py-2',
          'transition-colors hover:border-[var(--brand)] hover:bg-[var(--bg-soft)]/40',
          'focus-visible:outline-none focus-visible:shadow-ui-focus-strong',
        )}
        style={{ gridTemplateColumns: '112px minmax(0, 1fr) auto 40px' }}
      >
        <div className="relative h-14 w-[112px] shrink-0 overflow-hidden rounded-[10px] bg-[var(--bg-soft)]">
          {qtyBadge}
          {thumb}
        </div>

        <div className="min-w-0 overflow-hidden">
          <p className="truncate whitespace-nowrap text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
            {displayName}
          </p>
          {metaLeft || metaRight ? (
            <div className="mt-1 flex min-w-0 items-center gap-4">
              {metaLeft ? (
                <span className="inline-flex min-w-0 items-center gap-1 truncate text-[12px] leading-none text-[var(--text-muted)]">
                  <svg className="h-3.5 w-3.5 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="truncate">{metaLeft}</span>
                </span>
              ) : null}
              {metaRight ? (
                <span className="shrink-0 text-[12px] font-semibold leading-none text-[var(--warning)]">
                  {metaRight}
                </span>
              ) : null}
            </div>
          ) : null}
          {chips ? <div className="posd:hidden">{chips}</div> : null}
        </div>

        <span className="whitespace-nowrap text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">
          {priceLabel}
        </span>

        {addButton('h-10 w-10 min-h-[40px] min-w-[40px]', 'desktop', true)}
      </div>
    </div>
  );
};

export default POSItemCard;
