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
  rows: UpcomingAppointmentRow[];
  onAddBooking?: () => void;
  onViewSchedule?: () => void;
  onRowAction?: (id: string) => void;
  className?: string;
}

export const UpcomingAppointments: React.FC<UpcomingAppointmentsProps> = ({
  title = "Today's Appointments",
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
          title="No appointments scheduled today."
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
              className={cx(
                'm-appointment-row grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2 gap-y-1 rounded-none border-0 px-3 py-2.5 sm:flex sm:items-center sm:gap-3 sm:px-4 sm:py-3',
              )}
            >
              <div className="w-auto shrink-0 sm:w-24">
                <p className="m-appointment-row-title text-sm font-bold tabular-nums text-[var(--text-primary)]">{row.timeLabel}</p>
                {row.timeRangeLabel ? (
                  <p className="text-xs tabular-nums text-[var(--text-secondary)]">{row.timeRangeLabel}</p>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <ExpandableText
                  text={row.title}
                  className="m-appointment-row-title text-sm font-semibold text-[var(--text-primary)]"
                />
                {row.metaLabel ? (
                  <ExpandableText
                    text={row.metaLabel}
                    className="m-appointment-row-meta text-xs text-[var(--text-secondary)]"
                  />
                ) : null}
              </div>
              <div className="col-start-2 flex min-w-0 items-center gap-2 sm:max-w-[10rem]">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand-deep)]">
                  {row.customerName.charAt(0).toUpperCase()}
                </div>
                <ExpandableText
                  text={row.customerName}
                  lines={1}
                  className="text-sm text-[var(--text-secondary)]"
                />
              </div>
              {row.statusLabel ? (
                <StatusBadge
                  className={cx('col-start-3 row-start-1 max-w-[7rem] shrink-0 whitespace-nowrap', row.statusClassName)}
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
                  className="col-start-3 row-start-2 shrink-0 justify-self-end text-[var(--text-secondary)]"
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
