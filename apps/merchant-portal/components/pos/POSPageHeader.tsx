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
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {shopName}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="ui-page-title">{title}</h1>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
          Live outlet
        </span>
      </div>
    </header>
    {banner}
  </div>
);

export default POSPageHeader;
