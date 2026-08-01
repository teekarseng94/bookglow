import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { FilterToolbar } from '../ui/FilterToolbar';
import { cx } from '../ui/cx';

export interface ReportFilterToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  chips?: React.ReactNode;
  desktopSort?: React.ReactNode;
  onOpenFilters?: () => void;
  filtersLabel?: string;
  showMobileFiltersButton?: boolean;
  className?: string;
}

/** Search + type chips + optional mobile Filters entry. Parent owns all filter state. */
export const ReportFilterToolbar: React.FC<ReportFilterToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  chips,
  desktopSort,
  onOpenFilters,
  filtersLabel = 'Filters',
  showMobileFiltersButton = true,
  className,
}) => (
  <div className={cx('space-y-3', className)}>
    <FilterToolbar
      search={
        <div className="relative">
          <input
            type="search"
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 min-h-[42px] sm:min-h-[44px] bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-sm outline-none focus-visible:shadow-ui-focus-strong text-sm"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      }
      chips={chips ? <div className="m-filter-chips flex gap-2 overflow-x-auto min-w-0 pb-0.5">{chips}</div> : undefined}
      filters={
        <div className="flex items-center gap-2 w-full min-w-0">
          {showMobileFiltersButton && onOpenFilters ? (
            <IconButton
              variant="outline"
              size="md"
              label={filtersLabel}
              className="sm:hidden shrink-0"
              onClick={onOpenFilters}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
            </IconButton>
          ) : null}
          {desktopSort ? <div className="hidden sm:flex items-center gap-2 shrink-0">{desktopSort}</div> : null}
        </div>
      }
    />
  </div>
);

export default ReportFilterToolbar;
