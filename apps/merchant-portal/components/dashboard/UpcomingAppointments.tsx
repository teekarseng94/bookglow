import React from 'react';
import { Calendar, MoreVertical } from 'lucide-react';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { SectionHeader } from '../ui/SectionHeader';
import { StatusBadge } from '../ui/StatusBadge';
import { cx } from '../ui/cx';
import { DashboardEmptyState } from './DashboardEmptyState';

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
  <section className={cx('space-y-3', className)}>
    <SectionHeader
      title={title}
      count={rows.length}
      actions={onViewSchedule ? (
        <button type="button" onClick={onViewSchedule} className="text-xs font-semibold text-[var(--brand)] hover:underline shrink-0">
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
          {rows.map((row, index) => (
            <div
              key={row.id}
              className={cx(
                'm-appointment-row border-0 rounded-none px-3 sm:px-4 py-3 grid grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:flex sm:items-center gap-x-2 gap-y-1 sm:gap-3',
                index >= 4 && 'hidden sm:flex',
              )}
            >
              <div className="w-auto sm:w-20 shrink-0">
                <p className="m-appointment-row-title text-sm font-bold text-[var(--text-primary)] tabular-nums">{row.timeLabel}</p>
                {row.timeRangeLabel ? (
                  <p className="text-xs text-[var(--text-muted)] tabular-nums truncate">{row.timeRangeLabel}</p>
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className="m-appointment-row-title text-sm font-semibold text-[var(--text-primary)] truncate">{row.title}</p>
                {row.metaLabel ? <p className="m-appointment-row-meta text-xs text-[var(--text-muted)] truncate">{row.metaLabel}</p> : null}
              </div>
              <div className="col-start-2 flex items-center gap-2 min-w-0 sm:max-w-[140px]">
                <div className="w-7 h-7 rounded-full bg-[var(--brand-soft)] text-[var(--brand-deep)] flex items-center justify-center text-xs font-bold shrink-0">
                  {row.customerName.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm text-[var(--text-secondary)] truncate">{row.customerName}</p>
              </div>
              {row.statusLabel ? (
                <StatusBadge className={cx('col-start-3 row-start-1 shrink-0 max-w-[5.5rem] truncate', row.statusClassName)}>
                  {row.statusLabel}
                </StatusBadge>
              ) : null}
              {onRowAction ? (
                <IconButton
                  onClick={() => onRowAction(row.id)}
                  label={`Actions for ${row.title}`}
                  size="sm"
                  className="col-start-3 row-start-2 justify-self-end text-[var(--text-muted)] shrink-0"
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
