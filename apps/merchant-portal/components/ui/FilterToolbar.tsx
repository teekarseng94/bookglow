import React from 'react';
import { cx } from './cx';

export interface FilterToolbarProps {
  search?: React.ReactNode;
  filters?: React.ReactNode;
  chips?: React.ReactNode;
  actions?: React.ReactNode;
  active?: boolean;
  className?: string;
}

/**
 * Layout shell for search + filters + actions. Parents own filter state and handlers.
 */
export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  search,
  filters,
  chips,
  actions,
  active = false,
  className,
}) => (
  <div
    className={cx(
      'm-filter-toolbar flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between',
      active && 'm-filter-toolbar--active',
      className,
    )}
  >
    <div className="m-filter-toolbar-row flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
      {search ? <div className="m-filter-search">{search}</div> : null}
      {filters ? (
        <div className="m-filter-controls m-filter-actions flex flex-wrap items-center gap-2">{filters}</div>
      ) : null}
    </div>
    {actions ? (
      <div className="m-filter-actions flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
    ) : null}
    {chips ? <div className="m-filter-chips w-full lg:basis-full">{chips}</div> : null}
  </div>
);

export default FilterToolbar;
