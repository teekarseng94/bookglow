import React from 'react';
import { Appointment, Client, Service, Staff } from '../../types';
import { Button } from '../ui';
import { cx } from '../ui/cx';

export type ScheduleDesktopTab = 'details' | 'notes' | 'history';

interface Props {
  appointment: Appointment;
  client?: Client;
  service?: Service;
  staff?: Staff;
  tab: ScheduleDesktopTab;
  onTabChange: (tab: ScheduleDesktopTab) => void;
  onClose: () => void;
  onStatusChange: (status: Appointment['status']) => void;
  onCollectPayment: () => void;
}

const statusTone = (status: Appointment['status']) => ({
  scheduled: 'bg-[var(--brand-soft)] text-[var(--brand)]',
  completed: 'bg-[var(--success-soft)] text-[var(--success)]',
  'no-show': 'bg-[var(--danger-soft)] text-[var(--danger)]',
  cancelled: 'bg-[var(--bg-soft)] text-[var(--text-muted)]',
})[status];

export const ScheduleDesktopDetailPanel: React.FC<Props> = ({
  appointment, client, service, staff, tab, onTabChange, onClose, onStatusChange, onCollectPayment,
}) => {
  const dateLabel = new Date(appointment.date).toLocaleDateString('default', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
  const initials = (client?.name || 'Guest').split(/\s+/).map((part) => part[0]).join('').slice(0, 2);
  return (
    <aside className="hidden w-[380px] max-w-[38vw] shrink-0 flex-col border-l border-[var(--line)] bg-[var(--bg-surface)] md:flex">
      <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--bg-surface)] px-5 pt-5">
        <div className="flex items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate text-sm font-bold">Booking #{appointment.id}</h2>
          <span className={cx('rounded-full px-2 py-1 text-[11px] font-semibold capitalize', statusTone(appointment.status))}>{appointment.status}</span>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-xl text-[var(--text-muted)] hover:bg-[var(--bg-soft)]" aria-label="Close booking details">×</button>
        </div>
        <nav className="mt-4 flex gap-6">
          {(['details', 'notes', 'history'] as ScheduleDesktopTab[]).map((item) => (
            <button key={item} type="button" onClick={() => onTabChange(item)}
              className={cx('border-b-2 pb-3 text-xs font-semibold capitalize', tab === item ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--text-muted)]')}>{item}</button>
          ))}
        </nav>
      </header>
      <div className="flex-1 overflow-y-auto p-5">
        {tab === 'details' ? (
          <div className="space-y-4">
            <section className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-sm font-bold text-[var(--brand)]">{initials}</span>
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{client?.name || 'Guest'}</p>{client?.phone ? <p className="text-xs text-[var(--text-muted)]">{client.phone}</p> : null}{client?.email ? <p className="truncate text-xs text-[var(--text-muted)]">{client.email}</p> : null}</div>
            </section>
            <section className="rounded-ui-md border border-[var(--line)]">
              <h3 className="border-b border-[var(--line)] px-4 py-3 text-xs font-bold">Appointment</h3>
              <dl className="space-y-3 p-4 text-xs">
                <div><dt className="text-[var(--text-muted)]">Date</dt><dd className="mt-0.5 font-medium">{dateLabel}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Time</dt><dd className="mt-0.5 font-medium">{appointment.time} – {appointment.endTime || appointment.time} {service?.duration ? `(${service.duration} mins)` : ''}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Staff</dt><dd className="mt-0.5 font-medium">{staff?.name || 'Staff'}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Service</dt><dd className="mt-0.5 font-medium">{service?.name || 'Service'}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Price</dt><dd className="mt-0.5 font-medium">RM {Number(service?.price || 0).toFixed(2)}</dd></div>
              </dl>
            </section>
            <section className="rounded-ui-md border border-[var(--line)] p-3">
              <label className="text-[11px] font-bold text-[var(--text-muted)]" htmlFor="desktop-booking-status">Status</label>
              <select id="desktop-booking-status" value={appointment.status} onChange={(e) => onStatusChange(e.target.value as Appointment['status'])} className="mt-2 h-10 w-full rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)] px-3 text-sm font-semibold capitalize">
                <option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="no-show">No-show</option><option value="cancelled">Cancelled</option>
              </select>
            </section>
            <section className="rounded-ui-md border border-[var(--line)] p-4">
              <div className="flex items-center justify-between"><h3 className="text-xs font-bold">Payment</h3><button type="button" onClick={onCollectPayment} className="text-xs font-semibold text-[var(--brand)]">Collect payment</button></div>
              <p className="mt-3 text-xs text-[var(--text-muted)]">{appointment.status === 'completed' ? 'Appointment completed.' : 'No payment recorded on this booking.'}</p><p className="mt-2 text-sm font-bold">RM {Number(service?.price || 0).toFixed(2)}</p>
            </section>
            {client?.notes ? <section className="rounded-ui-md border border-[var(--line)] p-4"><h3 className="text-xs font-bold">Customer Notes</h3><p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{client.notes}</p></section> : null}
          </div>
        ) : tab === 'notes' ? <div className="rounded-ui-md border border-[var(--line)] p-4 text-sm text-[var(--text-secondary)]">{client?.notes || 'No customer notes available.'}</div>
          : <div className="py-12 text-center text-sm text-[var(--text-muted)]">No booking history available.</div>}
      </div>
      <footer className="sticky bottom-0 space-y-3 border-t border-[var(--line)] bg-[var(--bg-surface)] p-4">
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => onStatusChange('no-show')}>No-Show</Button><Button variant="danger" onClick={() => onStatusChange('cancelled')}>Cancel Booking</Button></div>
        <Button fullWidth onClick={() => onStatusChange('completed')}>Mark as Completed</Button>
      </footer>
    </aside>
  );
};
