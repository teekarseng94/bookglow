import React from 'react';
import { EmptyState } from '../ui/EmptyState';
import { cx } from '../ui/cx';

export interface ScheduleEmptyStateProps {
  title?: string;
  description?: string;
  compact?: boolean;
  action?: React.ReactNode;
  className?: string;
}

export const ScheduleEmptyState: React.FC<ScheduleEmptyStateProps> = ({
  title = 'No bookings',
  description,
  compact,
  action,
  className,
}) => {
  if (compact) {
    return <p className={cx('m-caption', className)}>{title}</p>;
  }
  return (
    <EmptyState
      className={className}
      title={title}
      description={description}
      action={action}
    />
  );
};

export default ScheduleEmptyState;
