import React from 'react';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { cx } from '../ui/cx';

export interface SchedulePageHeaderProps {
  title?: string;
  dateLabel: string;
  viewLabel?: string;
  onNewBooking: () => void;
  className?: string;
}

export const SchedulePageHeader: React.FC<SchedulePageHeaderProps> = ({
  title = 'Schedule',
  dateLabel,
  viewLabel,
  onNewBooking,
  className,
}) => (
  <PageHeader
    className={cx('hidden md:flex border-[var(--line)]', className)}
    title={title}
    description={viewLabel ? `${dateLabel} · ${viewLabel}` : dateLabel}
    actions={
      <Button variant="primary" size="md" onClick={onNewBooking}>
        New Booking
      </Button>
    }
  />
);

export default SchedulePageHeader;
