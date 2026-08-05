import React, { useEffect, useRef, useState } from 'react';
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
  /** Desktop section heading above the chip/search row. Default: Services */
  sectionTitle?: string;
  className?: string;
}

const TAB_LABELS: Record<POSCatalogTab, string> = {
  all: 'All',
  services: 'Services',
  products: 'Products',
  packages: 'Packages',
};

const SORT_OPTIONS: { value: POSSortBy; label: string }[] = [
  { value: 'a-z', label: 'Sort A–Z' },
  { value: 'z-a', label: 'Sort Z–A' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

function categoryChipLabel(cat: string): string {
  if (cat === 'All') return 'All Services';
  return cat;
}

const FilterSortControl: React.FC<{
  activeCatalog: POSCatalogTab;
  onCatalogChange: (value: POSCatalogTab) => void;
  sortBy: POSSortBy;
  onSortChange: (value: POSSortBy) => void;
  filtersActive: boolean;
}> = ({ activeCatalog, onCatalogChange, sortBy, onSortChange, filtersActive }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Catalogue filters and sort"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className={cx(
          'inline-flex h-10 w-10 items-center justify-center rounded-ui-md border transition-colors',
          'focus-visible:shadow-ui-focus-strong posd:h-11 posd:w-11',
          open || filtersActive
            ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]'
            : 'border-[var(--line)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]',
        )}
      >
        <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 4h18M6 12h12M10 20h4"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Catalogue filters and sort"
          className="absolute right-0 top-[calc(100%+6px)] z-40 w-56 overflow-hidden rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] py-1 shadow-ui-lg"
        >
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Sort
          </p>
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSortChange(option.value);
                setOpen(false);
              }}
              className={cx(
                'flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium transition-colors',
                sortBy === option.value
                  ? 'bg-[var(--brand-soft)] text-[var(--brand)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--bg-soft)]',
              )}
            >
              <span>{option.label}</span>
              {sortBy === option.value ? (
                <span className="text-[var(--brand)]" aria-hidden>
                  ✓
                </span>
              ) : null}
            </button>
          ))}

          <div className="my-1 border-t border-[var(--line)]" />

          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Catalogue
          </p>
          {(['all', 'services', 'products', 'packages'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                onCatalogChange(cat);
                setOpen(false);
              }}
              className={cx(
                'flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium transition-colors',
                activeCatalog === cat
                  ? 'bg-[var(--brand-soft)] text-[var(--brand)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--bg-soft)]',
              )}
            >
              <span>{TAB_LABELS[cat]}</span>
              {activeCatalog === cat ? (
                <span className="text-[var(--brand)]" aria-hidden>
                  ✓
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

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
  sectionTitle = 'Services',
  className,
}) => {
  const filtersActive =
    activeCatalog !== 'all' || selectedCategory !== 'All' || sortBy !== 'a-z';

  const renderCategoryChips = (keyPrefix: string) => (
    <div className="m-filter-chips flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5 scrollbar-thin">
      {categories.map((cat) => (
        <button
          key={`${keyPrefix}-${cat}`}
          type="button"
          onClick={() => onCategoryChange(cat)}
          className={cx(
            'm-pos-category-chip shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all whitespace-nowrap',
            selectedCategory === cat
              ? 'bg-[var(--brand)] text-white shadow-ui-xs'
              : 'border border-[var(--line)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]',
          )}
        >
          {categoryChipLabel(cat)}
        </button>
      ))}
    </div>
  );

  const renderSearchField = (wide = false) => (
    <div className={cx('m-filter-search relative w-full shrink-0', wide && 'posd:w-[210px]')}>
      <input
        type="search"
        placeholder="Search services"
        aria-label="Search services"
        className="m-pos-search h-10 w-full rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] py-2 pl-9 pr-3 text-sm outline-none focus-visible:shadow-ui-focus-strong posd:h-11"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>
  );

  return (
    <div
      className={cx(
        'm-pos-toolbar space-y-3',
        filtersActive && 'm-filter-toolbar--active',
        className,
      )}
    >
      {/* Mobile / tablet */}
      <div className="space-y-3 posd:hidden">
        <div className="m-card flex items-center gap-2 rounded-ui-md bg-[var(--bg-surface)] p-2.5">
          <div className="min-w-0 flex-1">{renderSearchField()}</div>
          <FilterSortControl
            activeCatalog={activeCatalog}
            onCatalogChange={onCatalogChange}
            sortBy={sortBy}
            onSortChange={onSortChange}
            filtersActive={filtersActive}
          />
        </div>
        {renderCategoryChips('m')}
      </div>

      {/* Desktop (1200+) */}
      <div className="hidden space-y-3 posd:block">
        <h2 className="text-[21px] font-bold leading-tight tracking-tight text-[var(--text-primary)]">
          {sectionTitle}
        </h2>
        <div className="flex items-center justify-between gap-3">
          {renderCategoryChips('d')}
          <div className="flex shrink-0 items-center gap-2">
            {renderSearchField(true)}
            <FilterSortControl
              activeCatalog={activeCatalog}
              onCatalogChange={onCatalogChange}
              sortBy={sortBy}
              onSortChange={onSortChange}
              filtersActive={filtersActive}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSCatalogueToolbar;
