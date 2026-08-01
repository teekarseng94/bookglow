import React from 'react';
import { ArrowUpDown, Filter, Search } from 'lucide-react';
import { FilterToolbar } from '../ui/FilterToolbar';
import { IconButton } from '../ui/IconButton';
import { cx } from '../ui/cx';
import type { InventoryCatalogTab } from './InventoryTypeTabs';

export type InventorySortOption = 'a-z' | 'z-a' | 'price-low' | 'price-high';
export type InventoryStatusFilter = 'all' | 'active' | 'low-stock' | 'out-of-stock';
export type InventoryVisibilityFilter = 'all' | 'visible' | 'hidden';

export interface InventoryToolbarProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: InventorySortOption;
  onSortChange: (value: InventorySortOption) => void;
  statusFilter?: InventoryStatusFilter;
  onStatusFilterChange?: (value: InventoryStatusFilter) => void;
  visibilityFilter?: InventoryVisibilityFilter;
  onVisibilityFilterChange?: (value: InventoryVisibilityFilter) => void;
  onOpenFiltersSheet?: () => void;
  onOpenSortSheet?: () => void;
  activeTab?: InventoryCatalogTab;
  className?: string;
}

const SEARCH_PLACEHOLDER: Record<InventoryCatalogTab, string> = {
  services: 'Search services...',
  products: 'Search products...',
  packages: 'Search packages...',
};

export const InventoryToolbar: React.FC<InventoryToolbarProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  statusFilter = 'all',
  onStatusFilterChange,
  visibilityFilter = 'all',
  onVisibilityFilterChange,
  onOpenFiltersSheet,
  onOpenSortSheet,
  activeTab = 'services',
  className,
}) => {
  const placeholder = SEARCH_PLACEHOLDER[activeTab];

  return (
    <div className={cx('space-y-3', className)}>
      {/* Mobile: Search + Filter + Sort single row */}
      <div className="m-inventory-toolbar md:hidden">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden
          />
          <label className="sr-only" htmlFor="inventory-search-mobile">
            {placeholder}
          </label>
          <input
            id="inventory-search-mobile"
            type="search"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="m-inventory-search w-full border border-[var(--line-strong)] bg-[var(--bg-surface)] pr-3 text-[var(--text-primary)] focus-visible:shadow-ui-focus-strong"
          />
        </div>
        {onOpenFiltersSheet ? (
          <IconButton
            variant="outline"
            size="md"
            label="Filter inventory"
            className={cx(statusFilter !== 'all' || visibilityFilter !== 'all' || selectedCategory !== 'All' ? 'border-[var(--brand)] text-[var(--brand)] bg-[var(--brand-soft)]' : undefined)}
            onClick={onOpenFiltersSheet}
          >
            <Filter className="h-4 w-4 shrink-0" aria-hidden />
          </IconButton>
        ) : null}
        {onOpenSortSheet ? (
          <IconButton
            variant="outline"
            size="md"
            label="Sort inventory"
            className={cx(sortBy !== 'a-z' ? 'border-[var(--brand)] text-[var(--brand)] bg-[var(--brand-soft)]' : undefined)}
            onClick={onOpenSortSheet}
          >
            <ArrowUpDown className="h-4 w-4 shrink-0" aria-hidden />
          </IconButton>
        ) : null}
      </div>

      {/* Desktop / tablet: dedicated filter row — category / status / visibility (left), sort (right) */}
      <div className="hidden md:block">
        <FilterToolbar
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="inventory-category">
                Category
              </label>
              <select
                id="inventory-category"
                value={selectedCategory}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="m-inventory-search h-10 px-3 rounded-ui-sm border border-[var(--line-strong)] bg-[var(--bg-surface)] text-sm font-medium text-[var(--text-primary)]"
              >
                <option value="All">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {onStatusFilterChange ? (
                <>
                  <label className="sr-only" htmlFor="inventory-status">
                    Status
                  </label>
                  <select
                    id="inventory-status"
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value as InventoryStatusFilter)}
                    className="m-inventory-search h-10 px-3 rounded-ui-sm border border-[var(--line-strong)] bg-[var(--bg-surface)] text-sm font-medium text-[var(--text-primary)]"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="low-stock">Low Stock</option>
                    <option value="out-of-stock">Out of Stock</option>
                  </select>
                </>
              ) : null}

              {onVisibilityFilterChange ? (
                <>
                  <label className="sr-only" htmlFor="inventory-visibility">
                    Visibility
                  </label>
                  <select
                    id="inventory-visibility"
                    value={visibilityFilter}
                    onChange={(e) => onVisibilityFilterChange(e.target.value as InventoryVisibilityFilter)}
                    className="m-inventory-search h-10 px-3 rounded-ui-sm border border-[var(--line-strong)] bg-[var(--bg-surface)] text-sm font-medium text-[var(--text-primary)]"
                  >
                    <option value="all">All Visibility</option>
                    <option value="visible">Visible</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </>
              ) : null}
            </div>
          }
          actions={
            <>
              <label className="sr-only" htmlFor="inventory-sort">
                Sort by
              </label>
              <select
                id="inventory-sort"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as InventorySortOption)}
                className="m-inventory-search h-10 px-3 rounded-ui-sm border border-[var(--line-strong)] bg-[var(--bg-surface)] text-sm font-medium text-[var(--text-primary)]"
              >
                <option value="a-z">Name A–Z</option>
                <option value="z-a">Name Z–A</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </>
          }
        />
      </div>
    </div>
  );
};

export default InventoryToolbar;
