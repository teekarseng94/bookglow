import React from 'react';
import { cx } from '../ui/cx';
import { Button } from '../ui/Button';
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
      <div className="m-pos-catalogue-grid">
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
  <div className={cx('space-y-4 posd:space-y-5', className)}>{children}</div>
);

export type POSEmptyKind = 'none' | 'no-results' | 'no-catalog';

export function resolvePOSEmptyKind(input: {
  activeCatalog: 'all' | 'services' | 'products' | 'packages';
  filteredServices: number;
  filteredProducts: number;
  filteredPackages: number;
  hasSearch: boolean;
  category: string;
}): POSEmptyKind {
  const empty =
    input.activeCatalog === 'all'
      ? input.filteredServices === 0 && input.filteredProducts === 0 && input.filteredPackages === 0
      : input.activeCatalog === 'services'
        ? input.filteredServices === 0
        : input.activeCatalog === 'products'
          ? input.filteredProducts === 0
          : input.filteredPackages === 0;
  if (!empty) return 'none';
  const hasQuery = input.hasSearch || input.category !== 'All' || input.activeCatalog !== 'all';
  return hasQuery ? 'no-results' : 'no-catalog';
}

export interface POSCatalogueEmptyStateProps {
  kind: Exclude<POSEmptyKind, 'none'>;
  onClearFilters: () => void;
  onGoToMenu: () => void;
}

export const POSCatalogueEmptyState: React.FC<POSCatalogueEmptyStateProps> = ({
  kind,
  onClearFilters,
  onGoToMenu,
}) => {
  if (kind === 'no-results') {
    return (
      <EmptyState
        title="No matching items"
        description="Try a different category or search."
        action={
          <Button type="button" variant="secondary" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      title="No services yet"
      description="Add services in Menu & Inventory to start selling."
      action={
        <Button type="button" variant="primary" onClick={onGoToMenu}>
          Go to Menu
        </Button>
      }
    />
  );
};

export default POSCatalogueList;
