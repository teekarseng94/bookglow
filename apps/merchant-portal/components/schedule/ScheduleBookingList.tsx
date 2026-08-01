import React from 'react';
import { ScheduleBookingCard } from './ScheduleBookingCard';
import { ScheduleEmptyState } from './ScheduleEmptyState';
import { cx } from '../ui/cx';
import { SectionHeader } from '../ui/SectionHeader';

export interface ScheduleBookingListItem {
  id: string;
  timeLabel: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  status: string;
}

export interface ScheduleBookingDaySection {
  date: string;
  heading: string;
  bookings: ScheduleBookingListItem[];
}

export interface ScheduleBookingListProps {
  days: ScheduleBookingDaySection[];
  onSelectBooking: (id: string) => void;
  loadMoreRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export const ScheduleBookingList: React.FC<ScheduleBookingListProps> = ({
  days,
  onSelectBooking,
  loadMoreRef,
  className,
}) => (
  <div
    className={cx(
      'md:hidden bg-[var(--bg-surface)] m-page-pad-compact m-page-with-sticky-action pt-4 space-y-5',
      className,
    )}
  >
    {days.map((day) => (
      <section key={day.date} data-agenda-date={day.date} className="space-y-2 scroll-mt-[116px]">
        <SectionHeader title={day.heading} count={day.bookings.length || undefined} />
        {day.bookings.length === 0 ? (
          <ScheduleEmptyState compact title="Nothing planned" />
        ) : (
          <div className="space-y-2">
            {day.bookings.map((booking) => (
              <ScheduleBookingCard
                key={booking.id}
                timeLabel={booking.timeLabel}
                customerName={booking.customerName}
                serviceName={booking.serviceName}
                staffName={booking.staffName}
                status={booking.status}
                onClick={() => onSelectBooking(booking.id)}
              />
            ))}
          </div>
        )}
      </section>
    ))}
    <div ref={loadMoreRef} className="h-2" aria-hidden />
  </div>
);

export default ScheduleBookingList;
