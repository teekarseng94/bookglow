import React from 'react';
import { Button } from '../ui/Button';
import { FilterToolbar } from '../ui/FilterToolbar';
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
  onAddMember,
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
      actions={
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onOpenFilters ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="sm:hidden m-add-customer-row flex-1"
              onClick={onOpenFilters}
            >
              Actions
            </Button>
          ) : null}
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="sm:hidden m-add-customer-row flex-1"
            onClick={onAddMember}
            aria-label="Add member"
          >
            + Add
          </Button>
          <div className="hidden sm:flex flex-wrap items-center gap-2">{desktopActions}</div>
        </div>
      }
    />
    {sortTabs}
  </div>
);

export default MemberToolbar;
