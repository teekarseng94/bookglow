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
        'm-pos-section-title mb-3 flex items-center gap-2',
        titleClassName || 'text-[var(--brand)]',
      )}
    >
      {icon}
      {title}
    </h3>
    {empty ? (
      <div className="py-10 text-center text-[var(--text-muted)] text-sm">{emptyMessage}</div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
        {children}
      </div>
    )}
  </section>
);

export interface POSCatalogueListProps {
  children: React.ReactNode;
  className?: string;
}

export const POSCatalogueList: React.FC<POSCatalogueListProps> = ({ children, className }) => (
  <div className={cx('space-y-6', className)}>{children}</div>
);

export default POSCatalogueList;
