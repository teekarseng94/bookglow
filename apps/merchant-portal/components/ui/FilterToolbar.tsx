import React from 'react';
import { cx } from './cx';

export interface FilterToolbarProps {
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Layout shell for search + filters + actions. Parents own filter state and handlers.
 */
export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  search,
  filters,
  actions,
  className,
}) => (
  <div
    className={cx(
      'm-filter-toolbar flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between',
      className,
    )}
  >
    <div className="m-filter-toolbar-row flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
      {search ? <div className="min-w-0 flex-1">{search}</div> : null}
      {filters ? (
        <div className="m-filter-actions flex flex-wrap items-center gap-2">{filters}</div>
      ) : null}
    </div>
    {actions ? (
      <div className="m-filter-actions flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
    ) : null}
  </div>
);

export default FilterToolbar;
