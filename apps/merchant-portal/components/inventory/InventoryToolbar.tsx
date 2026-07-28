import React from 'react';
import { ArrowUpDown, Filter, Search } from 'lucide-react';
import { FilterToolbar } from '../ui/FilterToolbar';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import type { InventoryCatalogTab } from './InventoryTypeTabs';

export type InventorySortOption = 'a-z' | 'z-a' | 'price-low' | 'price-high';

export interface InventoryToolbarProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: InventorySortOption;
  onSortChange: (value: InventorySortOption) => void;
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
          <button
            type="button"
            className="m-inventory-tool-btn focus-visible:shadow-ui-focus-strong"
            onClick={onOpenFiltersSheet}
            aria-label="Filter"
          >
            <Filter className="h-4 w-4 shrink-0" aria-hidden />
            <span>Filter</span>
          </button>
        ) : null}
        {onOpenSortSheet ? (
          <button
            type="button"
            className="m-inventory-tool-btn focus-visible:shadow-ui-focus-strong"
            onClick={onOpenSortSheet}
            aria-label="Sort"
          >
            <ArrowUpDown className="h-4 w-4 shrink-0" aria-hidden />
            <span>Sort</span>
          </button>
        ) : null}
      </div>

      {/* Desktop / tablet: category chips + existing FilterToolbar */}
      <div className="hidden md:block space-y-3">
        <div className="overflow-x-auto">
          <div className="flex gap-2 pb-1 min-w-0">
            <button
              type="button"
              onClick={() => onCategoryChange('All')}
              className={cx(
                'm-inventory-chip flex-shrink-0 whitespace-nowrap border transition-colors',
                selectedCategory === 'All'
                  ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                  : 'bg-[var(--bg-surface)] border-[var(--line)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]',
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={cx(
                  'm-inventory-chip flex-shrink-0 whitespace-nowrap border transition-colors',
                  selectedCategory === cat
                    ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                    : 'bg-[var(--bg-surface)] border-[var(--line)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <FilterToolbar
          search={
            <div className="relative">
              <label className="sr-only" htmlFor="inventory-search">
                Search catalog
              </label>
              <input
                id="inventory-search"
                type="search"
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="m-inventory-search w-full h-10 pl-3 pr-3 rounded-ui-sm border border-[var(--line-strong)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus-visible:shadow-ui-focus-strong"
              />
            </div>
          }
          filters={
            <div className="flex items-center gap-2">
              {onOpenFiltersSheet ? (
                <Button variant="secondary" size="sm" className="lg:hidden" onClick={onOpenFiltersSheet}>
                  Filters
                </Button>
              ) : null}
              <label className="sr-only" htmlFor="inventory-sort">
                Sort by
              </label>
              <select
                id="inventory-sort"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as InventorySortOption)}
                className="m-inventory-search h-10 px-3 rounded-ui-sm border border-[var(--line-strong)] bg-[var(--bg-surface)] text-sm font-medium text-[var(--text-primary)]"
              >
                <option value="a-z">A–Z</option>
                <option value="z-a">Z–A</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          }
        />
      </div>
    </div>
  );
};

export default InventoryToolbar;
