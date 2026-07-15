import React from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import { DashboardEmptyState } from './DashboardEmptyState';

export interface UpcomingAppointmentRow {
  id: string;
  timeLabel: string;
  title: string;
  subtitle?: string;
  statusLabel?: string;
  statusClassName?: string;
}

export interface UpcomingAppointmentsProps {
  title?: string;
  rows: UpcomingAppointmentRow[];
  onAddBooking?: () => void;
  className?: string;
}

export const UpcomingAppointments: React.FC<UpcomingAppointmentsProps> = ({
  title = "Today's appointments",
  rows,
  onAddBooking,
  className,
}) => (
  <section className={cx('space-y-3', className)}>
    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{title}</h3>
    {rows.length === 0 ? (
      <DashboardEmptyState
        icon={<Calendar className="w-6 h-6" />}
        title="No appointments today"
        action={
          onAddBooking ? (
            <Button type="button" variant="primary" size="sm" onClick={onAddBooking}>
              Add Booking
            </Button>
          ) : undefined
        }
      />
    ) : (
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] px-4 py-3 flex items-center gap-3 shadow-ui-xs"
          >
            <div className="text-center min-w-[44px]">
              <p className="text-sm font-black text-[var(--brand)] tabular-nums">{row.timeLabel}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{row.title}</p>
              {row.subtitle ? (
                <p className="text-xs text-[var(--text-muted)] truncate">{row.subtitle}</p>
              ) : null}
            </div>
            {row.statusLabel ? (
              <span
                className={cx(
                  'text-[9px] font-black uppercase px-2 py-1 rounded-full',
                  row.statusClassName || 'bg-[var(--bg-soft)] text-[var(--text-muted)]',
                )}
              >
                {row.statusLabel}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    )}
  </section>
);

export default UpcomingAppointments;
