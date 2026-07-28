import React from 'react';
import { EmptyState } from '../ui/EmptyState';
import { cx } from '../ui/cx';

export interface StaffRosterProps {
  children: React.ReactNode;
<<<<<<< HEAD
=======
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

<<<<<<< HEAD
/** Compact scrollable roster shell. Parent supplies StaffCard children. */
export const StaffRoster: React.FC<StaffRosterProps> = ({
  children,
  empty,
  emptyTitle = 'No staff members registered.',
  emptyDescription = 'Add staff to track performance and commissions.',
=======
/** Directory shell: optional toolbar, list, optional pagination footer. */
export const StaffRoster: React.FC<StaffRosterProps> = ({
  children,
  toolbar,
  footer,
  empty,
  emptyTitle = 'No staff members found.',
  emptyDescription = 'Try adjusting search or filters, or add a staff member.',
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
  className,
}) => (
  <div
    className={cx(
<<<<<<< HEAD
      'space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1',
      className,
    )}
  >
    {empty ? (
      <EmptyState title={emptyTitle} description={emptyDescription} className="py-8" />
    ) : (
      children
    )}
=======
      'flex flex-col overflow-hidden',
      'xl:rounded-ui-lg xl:border xl:border-[var(--line)] xl:bg-[var(--bg-surface)] xl:shadow-ui-xs xl:min-h-[520px]',
      className,
    )}
  >
    {toolbar ? (
      <div className="pb-3 xl:p-4 xl:border-b xl:border-[var(--line)] space-y-3 shrink-0">
        {toolbar}
      </div>
    ) : null}
    <div
      className={cx(
        'flex-1 space-y-2.5 min-h-0',
        'xl:overflow-y-auto xl:p-3 xl:max-h-[min(62vh,640px)]',
      )}
    >
      {empty ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          className="py-10 rounded-ui-md border border-dashed border-[var(--line)] bg-[var(--bg-surface)]"
        />
      ) : (
        children
      )}
    </div>
    {footer ? (
      <div className="pt-3 mt-1 xl:mt-0 xl:p-3 xl:border-t xl:border-[var(--line)] xl:bg-[var(--bg-soft)]/60 shrink-0">
        {footer}
      </div>
    ) : null}
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
  </div>
);

export default StaffRoster;
