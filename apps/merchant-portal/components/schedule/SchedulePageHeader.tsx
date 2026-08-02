import React from 'react';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { cx } from '../ui/cx';

export interface SchedulePageHeaderProps {
  title?: string;
  dateLabel?: string;
  viewLabel?: string;
  onNewBooking?: () => void;
  className?: string;
}

export const SchedulePageHeader: React.FC<SchedulePageHeaderProps> = ({
  title = 'Schedule',
  onNewBooking,
  className,
}) => (
  <PageHeader
    className={cx('hidden md:flex border-[var(--line)]', className)}
    title={title}
    description={
      <span className="inline-flex items-center rounded-full bg-[var(--success-soft)] px-2 py-1 text-xs font-semibold text-[var(--success)]">
        Live outlet
      </span>
    }
    actions={onNewBooking ? (
      <Button variant="primary" size="md" onClick={onNewBooking}>
        New Booking
      </Button>
    ) : undefined}
  />
);

export default SchedulePageHeader;
