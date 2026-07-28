import React from 'react';
import { cx } from '../ui/cx';

export type POSCatalogTab = 'all' | 'services' | 'products' | 'packages';
export type POSSortBy = 'a-z' | 'z-a' | 'price-low' | 'price-high';

export interface POSCatalogueToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeCatalog: POSCatalogTab;
  onCatalogChange: (value: POSCatalogTab) => void;
  sortBy: POSSortBy;
  onSortChange: (value: POSSortBy) => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  className?: string;
}

<<<<<<< HEAD
=======
const TAB_LABELS: Record<POSCatalogTab, string> = {
  all: 'All',
  services: 'Services',
  products: 'Products',
  packages: 'Packages',
};

>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
export const POSCatalogueToolbar: React.FC<POSCatalogueToolbarProps> = ({
  search,
  onSearchChange,
  activeCatalog,
  onCatalogChange,
  sortBy,
  onSortChange,
  categories,
  selectedCategory,
  onCategoryChange,
  className,
}) => (
  <div className={cx('space-y-3', className)}>
<<<<<<< HEAD
    <div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-2 lg:gap-4">
      <div className="relative flex-1">
        <input
          type="search"
          placeholder="Search catalog..."
          className="w-full pl-11 pr-4 py-2.5 md:py-3 min-h-[44px] bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-md focus-visible:shadow-ui-focus-strong outline-none shadow-ui-xs text-sm"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
=======
    <div className="flex flex-col xl:flex-row xl:items-center gap-2.5 xl:gap-3">
      <div className="relative flex-1 min-w-0">
        <input
          type="search"
          placeholder="Search services or products..."
          className="w-full pl-10 pr-4 py-2.5 min-h-[44px] bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-md focus-visible:shadow-ui-focus-strong outline-none text-sm"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
<<<<<<< HEAD
      <div className="overflow-x-auto scrollbar-thin pb-1 md:overflow-visible md:pb-0">
        <div className="flex items-center gap-2 min-w-max md:min-w-0 md:flex-wrap">
          <div className="flex bg-[var(--bg-soft)] p-1 rounded-ui-md shadow-inner shrink-0">
            {(['all', 'services', 'products', 'packages'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onCatalogChange(cat)}
                className={cx(
                  'px-3 py-1.5 rounded-ui-sm text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
                  activeCatalog === cat
                    ? 'bg-[var(--bg-surface)] text-[var(--brand)] shadow-ui-xs'
                    : 'text-[var(--text-muted)]',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as POSSortBy)}
            className="shrink-0 md:ml-auto px-3 py-2 min-h-[40px] bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-md outline-none focus-visible:shadow-ui-focus-strong text-xs md:text-sm font-medium"
          >
            <option value="a-z">A–Z</option>
            <option value="z-a">Z–A</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>
    </div>

    <div className="overflow-x-auto scrollbar-thin pb-1">
      <div className="flex gap-2 min-w-0">
=======

      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin min-w-0">
        {(['all', 'services', 'products', 'packages'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onCatalogChange(cat)}
            className={cx(
              'shrink-0 px-3 py-2 rounded-ui-sm text-sm font-semibold transition-colors whitespace-nowrap',
              activeCatalog === cat
                ? 'text-[var(--brand)] bg-[var(--brand-soft)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]',
            )}
          >
            {TAB_LABELS[cat]}
          </button>
        ))}
      </div>

      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as POSSortBy)}
        aria-label="Sort catalog"
        className="shrink-0 xl:ml-auto w-full xl:w-auto px-3 py-2 min-h-[40px] bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-md outline-none focus-visible:shadow-ui-focus-strong text-sm font-medium"
      >
        <option value="a-z">A–Z</option>
        <option value="z-a">Z–A</option>
        <option value="price-low">Price: Low to High</option>
        <option value="price-high">Price: High to Low</option>
      </select>
    </div>

    <div className="overflow-x-auto scrollbar-thin -mx-0.5 px-0.5">
      <div className="flex gap-2 min-w-0 pb-0.5">
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryChange(cat)}
            className={cx(
<<<<<<< HEAD
              'shrink-0 px-4 py-2 rounded-ui-md text-sm font-semibold transition-all whitespace-nowrap',
              selectedCategory === cat
                ? 'bg-[var(--brand)] text-white shadow-ui-xs'
                : 'bg-[var(--bg-surface)] border border-[var(--line)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]',
=======
              'shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap',
              selectedCategory === cat
                ? 'bg-[var(--brand)] text-white shadow-ui-xs'
                : 'bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-selection)]',
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
            )}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default POSCatalogueToolbar;
