import React from 'react';
import { EmptyState } from '../ui/EmptyState';
import { cx } from '../ui/cx';

export interface StaffRosterProps {
  children: React.ReactNode;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

/** Compact scrollable roster shell. Parent supplies StaffCard children. */
export const StaffRoster: React.FC<StaffRosterProps> = ({
  children,
  empty,
  emptyTitle = 'No staff members registered.',
  emptyDescription = 'Add staff to track performance and commissions.',
  className,
}) => (
  <div
    className={cx(
      'space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1',
      className,
    )}
  >
    {empty ? (
      <EmptyState title={emptyTitle} description={emptyDescription} className="py-8" />
    ) : (
      children
    )}
  </div>
);

export default StaffRoster;
