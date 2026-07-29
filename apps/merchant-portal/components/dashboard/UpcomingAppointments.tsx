import React from 'react';
import { Calendar, MoreVertical } from 'lucide-react';
import { Button } from '../ui/Button';
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
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5" />
        {title}
      </h3>
      {onViewSchedule ? (
        <button type="button" onClick={onViewSchedule} className="text-xs font-semibold text-[var(--brand)] hover:underline shrink-0">
          View full schedule
        </button>
      ) : null}
    </div>
    <div className="bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs">
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
                'px-3 sm:px-4 py-3 grid grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:flex sm:items-center gap-x-2 gap-y-1 sm:gap-3',
                index >= 4 && 'hidden sm:flex',
              )}
            >
              <div className="w-auto sm:w-20 shrink-0">
                <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{row.timeLabel}</p>
                {row.timeRangeLabel ? (
                  <p className="text-xs text-[var(--text-muted)] tabular-nums truncate">{row.timeRangeLabel}</p>
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{row.title}</p>
                {row.metaLabel ? <p className="text-xs text-[var(--text-muted)] truncate">{row.metaLabel}</p> : null}
              </div>
              <div className="col-start-2 flex items-center gap-2 min-w-0 sm:max-w-[140px]">
                <div className="w-7 h-7 rounded-full bg-[var(--brand-soft)] text-[var(--brand-deep)] flex items-center justify-center text-xs font-bold shrink-0">
                  {row.customerName.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm text-[var(--text-secondary)] truncate">{row.customerName}</p>
              </div>
              {row.statusLabel ? (
                <span
                  className={cx(
                    'col-start-3 row-start-1 px-2 py-1 shrink-0 max-w-[5.5rem] truncate rounded-full text-[10px] sm:text-xs font-semibold capitalize',
                    row.statusClassName || 'bg-[var(--bg-soft)] text-[var(--text-muted)]',
                  )}
                >
                  {row.statusLabel}
                </span>
              ) : null}
              {onRowAction ? (
                <button
                  type="button"
                  onClick={() => onRowAction(row.id)}
                  aria-label={`Actions for ${row.title}`}
                  className="col-start-3 row-start-2 justify-self-end p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-soft)] shrink-0"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  </section>
);

export default UpcomingAppointments;
