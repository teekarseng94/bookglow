import React from 'react';
import { Calendar, MoreVertical } from 'lucide-react';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { SectionHeader } from '../ui/SectionHeader';
import { StatusBadge } from '../ui/StatusBadge';
import { cx } from '../ui/cx';
import { DashboardEmptyState } from './DashboardEmptyState';
import { ExpandableText } from './ExpandableText';

export interface UpcomingAppointmentRow {
  id: string;
  timeLabel: string;
  timeRangeLabel?: string;
  title: string;
  metaLabel?: string;
  customerName: string;
  statusLabel?: string;
  statusClassName?: string;
}

export interface UpcomingAppointmentsProps {
  title?: string;
  emptyTitle?: string;
  rows: UpcomingAppointmentRow[];
  onAddBooking?: () => void;
  onViewSchedule?: () => void;
  onRowAction?: (id: string) => void;
  className?: string;
}

export const UpcomingAppointments: React.FC<UpcomingAppointmentsProps> = ({
  title = "Today's Appointments",
  emptyTitle = 'No appointments scheduled today.',
  rows,
  onAddBooking,
  onViewSchedule,
  onRowAction,
  className,
}) => (
  <section className={cx('space-y-2 sm:space-y-3', className)}>
    <SectionHeader
      title={title}
      count={rows.length}
      actions={onViewSchedule ? (
        <button type="button" onClick={onViewSchedule} className="inline-flex min-h-11 items-center text-xs font-semibold text-[var(--brand)] hover:underline shrink-0 focus-visible:shadow-ui-focus-strong">
          View full schedule
        </button>
      ) : undefined}
    />
    <div className="m-card overflow-hidden bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs !p-0">
      {rows.length === 0 ? (
        <DashboardEmptyState
          icon={<Calendar className="w-6 h-6" />}
          title={emptyTitle}
          action={
            onAddBooking ? (
              <Button type="button" variant="primary" size="sm" onClick={onAddBooking}>
                Create booking
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="divide-y divide-[var(--line)]">
          {rows.map((row) => (
            <div
              key={row.id}
              className="m-list-row m-appointment-row flex items-center gap-3 rounded-none border-0 px-3 py-2 sm:px-4"
            >
              <div className="w-12 shrink-0 sm:w-24">
                <p className="m-appointment-row-title text-sm font-bold tabular-nums text-[var(--text-primary)]">{row.timeLabel}</p>
                {row.timeRangeLabel ? (
                  <p className="hidden text-xs tabular-nums text-[var(--text-secondary)] sm:block">{row.timeRangeLabel}</p>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <ExpandableText
                  text={row.title}
                  lines={1}
                  className="m-appointment-row-title text-sm font-semibold text-[var(--text-primary)]"
                />
                <div className="mt-0.5 flex min-w-0 items-center gap-1">
                  <ExpandableText
                    text={row.customerName}
                    lines={1}
                    className="m-appointment-row-meta min-w-0 text-xs text-[var(--text-secondary)]"
                  />
                  {row.metaLabel ? (
                    <span className="truncate text-xs text-[var(--text-secondary)]"> · {row.metaLabel}</span>
                  ) : null}
                </div>
              </div>
              {row.statusLabel ? (
                <StatusBadge
                  className={cx('max-w-[7rem] shrink-0 whitespace-nowrap', row.statusClassName)}
                  label={row.statusLabel}
                >
                  {row.statusLabel}
                </StatusBadge>
              ) : null}
              {onRowAction ? (
                <IconButton
                  onClick={() => onRowAction(row.id)}
                  label={`Open ${row.title} on the schedule`}
                  size="md"
                  className="shrink-0 text-[var(--text-secondary)]"
                >
                  <MoreVertical className="w-4 h-4" />
                </IconButton>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  </section>
);

export default UpcomingAppointments;
