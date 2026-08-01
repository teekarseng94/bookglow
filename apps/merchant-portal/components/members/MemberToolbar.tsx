import React from 'react';
import { FilterToolbar } from '../ui/FilterToolbar';
import { IconButton } from '../ui/IconButton';
import { cx } from '../ui/cx';

export interface MemberToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onAddMember: () => void;
  onOpenFilters?: () => void;
  desktopActions?: React.ReactNode;
  sortTabs?: React.ReactNode;
  className?: string;
}

/** Search stays visible; filters/actions can open in a sheet on mobile. */
export const MemberToolbar: React.FC<MemberToolbarProps> = ({
  search,
  onSearchChange,
  onOpenFilters,
  desktopActions,
  sortTabs,
  className,
}) => (
  <div className={cx('m-member-toolbar space-y-2 sm:space-y-3', className)}>
    <FilterToolbar
      search={
        <div className="relative">
          <label className="sr-only" htmlFor="member-search">
            Search members
          </label>
          <input
            id="member-search"
            type="search"
            placeholder="Search members..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 m-member-search md:min-h-[44px] md:h-auto md:text-sm md:rounded-ui-sm bg-[var(--bg-soft)] border-0 outline-none focus-visible:shadow-ui-focus-strong"
          />
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 m-member-search-icon md:w-4 md:h-4 text-[var(--text-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      }
      filters={
        onOpenFilters ? (
          <IconButton
            label="Member actions and filters"
            variant="outline"
            className="sm:hidden"
            onClick={onOpenFilters}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h18M6 12h12M10 19h4" />
            </svg>
          </IconButton>
        ) : undefined
      }
      actions={
        <div className="hidden sm:flex flex-wrap items-center gap-2">
          {desktopActions}
        </div>
      }
      chips={sortTabs}
      active={Boolean(search)}
    />
  </div>
);

export default MemberToolbar;
