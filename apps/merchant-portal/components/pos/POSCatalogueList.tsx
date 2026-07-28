import React from 'react';
import { cx } from '../ui/cx';

export interface POSCatalogueSectionProps {
  title: string;
  icon?: React.ReactNode;
  titleClassName?: string;
  children: React.ReactNode;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
}

export const POSCatalogueSection: React.FC<POSCatalogueSectionProps> = ({
  title,
  icon,
  titleClassName,
  children,
  empty,
  emptyMessage,
  className,
}) => (
  <section className={cx('animate-fadeIn', className)}>
    <h3
      className={cx(
<<<<<<< HEAD
        'text-xs font-semibold uppercase tracking-wide mb-4 flex items-center gap-2',
        titleClassName || 'text-[var(--brand-deep)]',
=======
        'text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2',
        titleClassName || 'text-[var(--brand)]',
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
      )}
    >
      {icon}
      {title}
    </h3>
    {empty ? (
<<<<<<< HEAD
      <div className="py-12 text-center text-[var(--text-muted)] text-sm">{emptyMessage}</div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">{children}</div>
=======
      <div className="py-10 text-center text-[var(--text-muted)] text-sm">{emptyMessage}</div>
    ) : (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {children}
      </div>
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
    )}
  </section>
);

export interface POSCatalogueListProps {
  children: React.ReactNode;
  className?: string;
}

export const POSCatalogueList: React.FC<POSCatalogueListProps> = ({ children, className }) => (
<<<<<<< HEAD
  <div className={cx('space-y-8 min-h-[60vh]', className)}>{children}</div>
=======
  <div className={cx('space-y-6 md:space-y-7', className)}>{children}</div>
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
);

export default POSCatalogueList;
