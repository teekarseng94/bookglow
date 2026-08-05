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
    <div className={cx('space-y-3', className)}>
      <header className="hidden space-y-1 md:block posd:hidden">
        {shopName ? (
          <p className="m-pos-page-eyebrow uppercase tracking-wider text-[var(--text-muted)]">
            {shopName}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="ui-page-title">{title}</h1>
          <StatusBadge tone="success" className="m-pos-live-badge gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" aria-hidden />
            Live outlet
          </StatusBadge>
        </div>
      </header>
      {banner}
    </div>
  );
};

export default POSPageHeader;
