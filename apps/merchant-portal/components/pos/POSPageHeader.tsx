import React from 'react';
import { cx } from '../ui/cx';

export interface POSPageHeaderProps {
  title?: string;
  shopName?: string;
  description?: string;
  banner?: React.ReactNode;
  className?: string;
}

export const POSPageHeader: React.FC<POSPageHeaderProps> = ({
  title = 'Point of Sale',
  shopName,
  banner,
  className,
}) => (
  <div className={cx('space-y-3', className)}>
    <header className="space-y-1">
      {shopName ? (
        <p className="m-pos-page-eyebrow uppercase tracking-wider text-[var(--text-muted)]">
          {shopName}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="ui-page-title">{title}</h1>
        <span className="m-pos-live-badge inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" aria-hidden />
          Live outlet
        </span>
      </div>
    </header>
    {banner}
  </div>
);

export default POSPageHeader;
