import React from 'react';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/EmptyState';
import { SectionHeader } from '../ui/SectionHeader';

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
    <SectionHeader
      className={cx('m-pos-section-title mb-3', titleClassName || 'text-[var(--brand)]')}
      title={<span className="flex items-center gap-2">{icon}{title}</span>}
    />
    {empty ? (
      <EmptyState className="border-0" title={emptyMessage || 'No items found'} />
    ) : (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-1 md:grid-cols-2 posd:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
