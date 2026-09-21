import React from 'react';
import { StatusBadge } from '../ui/StatusBadge';
import { cx } from '../ui/cx';

export interface POSPageHeaderProps {
  title?: string;
  shopName?: string;
  description?: string;
  banner?: React.ReactNode;
  className?: string;
}

/**
 * Phone/tablet page intro only.
 * Desktop shell already shows "Point of Sale" + Live outlet — do not duplicate.
 */
export const POSPageHeader: React.FC<POSPageHeaderProps> = ({
  title = 'Point of Sale',
  shopName,
  banner,
  className,
}) => {
  if (!banner && !title && !shopName) return null;

  return (
    <div className={cx('space-y-3 post:space-y-0 post:mb-1', className)}>
      <header className="hidden items-center gap-2 post:flex posd:hidden">
        <h1 className="sr-only">{title}</h1>
        {shopName ? (
          <p className="m-pos-page-eyebrow min-w-0 truncate uppercase tracking-wider text-[var(--text-muted)]">
            {shopName}
          </p>
        ) : null}
        <StatusBadge tone="success" className="m-pos-live-badge shrink-0 gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" aria-hidden />
          Live outlet
        </StatusBadge>
      </header>
      {banner}
    </div>
  );
};

export default POSPageHeader;
