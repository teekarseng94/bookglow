import React from 'react';
<<<<<<< HEAD
import { PageHeader } from '../ui/PageHeader';
=======
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
import { cx } from '../ui/cx';

export interface POSPageHeaderProps {
  title?: string;
<<<<<<< HEAD
=======
  shopName?: string;
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
  description?: string;
  banner?: React.ReactNode;
  className?: string;
}

export const POSPageHeader: React.FC<POSPageHeaderProps> = ({
  title = 'Point of Sale',
<<<<<<< HEAD
  description = 'Add items and complete checkout.',
=======
  shopName,
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
  banner,
  className,
}) => (
  <div className={cx('space-y-3', className)}>
<<<<<<< HEAD
    <PageHeader title={title} description={description} className="lg:hidden border-b-0 pb-0" />
=======
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
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
    {banner}
  </div>
);

export default POSPageHeader;
