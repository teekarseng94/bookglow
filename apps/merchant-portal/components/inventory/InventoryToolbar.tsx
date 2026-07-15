import React from 'react';
import { FilterToolbar } from '../ui/FilterToolbar';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';

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
  className?: string;
}

export const InventoryToolbar: React.FC<InventoryToolbarProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onOpenFiltersSheet,
  className,
}) => (
  <div className={cx('space-y-3', className)}>
    <div className="hidden sm:block overflow-x-auto">
      <div className="flex gap-2 pb-1 min-w-0">
        <button
          type="button"
          onClick={() => onCategoryChange('All')}
          className={cx(
            'flex-shrink-0 px-3 py-2 rounded-ui-sm text-sm font-semibold whitespace-nowrap border transition-colors',
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
              'flex-shrink-0 px-3 py-2 rounded-ui-sm text-sm font-semibold whitespace-nowrap border transition-colors',
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
            placeholder="Search by name…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 pl-3 pr-3 rounded-ui-sm border border-[var(--line-strong)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus-visible:shadow-ui-focus-strong"
          />
        </div>
      }
      filters={
        <div className="flex items-center gap-2">
          {onOpenFiltersSheet ? (
            <Button variant="secondary" size="sm" className="sm:hidden" onClick={onOpenFiltersSheet}>
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
            className="h-10 px-3 rounded-ui-sm border border-[var(--line-strong)] bg-[var(--bg-surface)] text-sm font-medium text-[var(--text-primary)]"
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
);

export default InventoryToolbar;
