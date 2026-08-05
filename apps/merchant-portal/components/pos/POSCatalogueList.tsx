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
  /** Hide section heading (desktop toolbar already shows Services). */
  hideTitle?: boolean;
  className?: string;
}

export const POSCatalogueSection: React.FC<POSCatalogueSectionProps> = ({
  title,
  icon,
  titleClassName,
  children,
  empty,
  emptyMessage,
  hideTitle,
  className,
}) => (
  <section className={cx('animate-fadeIn', className)}>
    {!hideTitle ? (
      <SectionHeader
        className={cx('m-pos-section-title mb-3 posd:mb-2', titleClassName || 'text-[var(--brand)]')}
        title={<span className="flex items-center gap-2">{icon}{title}</span>}
      />
    ) : null}
    {empty ? (
      <EmptyState className="border-0" title={emptyMessage || 'No items found'} />
    ) : (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-1 md:grid-cols-2 posd:flex posd:flex-col posd:gap-2.5">
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
  <div className={cx('space-y-6 posd:space-y-5', className)}>{children}</div>
);

export default POSCatalogueList;
