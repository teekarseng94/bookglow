import React from 'react';
import { Check, Clock3, Scissors, UsersRound } from 'lucide-react';
import { cx } from '../ui/cx';

export interface ScheduleSetupStateProps {
  businessName?: string;
  hasServices: boolean;
  hasStaff: boolean;
  className?: string;
}

const SetupStep: React.FC<{
  complete: boolean;
  href: string;
  icon: React.ReactNode;
  number: number;
  title: string;
  description: string;
  action: string;
}> = ({ complete, href, icon, number, title, description, action }) => (
  <article className={cx(
    'group relative flex min-h-[176px] flex-col rounded-ui-lg border p-5 transition-all',
    complete
      ? 'border-[var(--success)]/25 bg-[var(--success-soft)]'
      : 'border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-xs hover:-translate-y-0.5 hover:border-[var(--brand-border)] hover:shadow-ui-sm',
  )}>
    <div className="flex items-start justify-between gap-3">
      <span className={cx(
        'grid h-10 w-10 place-items-center rounded-ui-md',
        complete ? 'bg-[var(--success)] text-white' : 'bg-[var(--brand-soft)] text-[var(--brand)]',
      )}>
        {complete ? <Check className="h-5 w-5" aria-hidden /> : icon}
      </span>
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {complete ? 'Complete' : `Step ${number}`}
      </span>
    </div>
    <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">{title}</h3>
    <p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">{description}</p>
    <a href={href} className={cx(
      'mt-auto pt-4 text-sm font-bold',
      complete ? 'text-[var(--success)]' : 'text-[var(--brand)] group-hover:text-[var(--brand-hover)]',
    )}>
      {complete ? 'Review setup' : action} <span aria-hidden>→</span>
    </a>
  </article>
);

export const ScheduleSetupState: React.FC<ScheduleSetupStateProps> = ({
  businessName,
  hasServices,
  hasStaff,
  className,
}) => (
  <section className={cx('overflow-hidden rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-xs', className)}>
    <div className="grid gap-8 bg-gradient-to-br from-[var(--brand-soft)] via-[var(--bg-surface)] to-[var(--success-soft)] px-5 py-8 sm:px-8 md:grid-cols-[minmax(0,1fr)_340px] md:items-center md:px-10 md:py-10">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-bold text-[var(--brand-deep)]">
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" /> New workspace
        </span>
        <h1 className="mt-4 max-w-xl text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Your booking calendar is ready{businessName ? `, ${businessName}` : ''}.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
          Add what you offer and who provides it. BookGlow will then build your daily calendar automatically.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-[var(--brand)]" /> About 3 minutes</span>
          <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-[var(--success)]" /> Progress saves automatically</span>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[340px] rounded-ui-lg border border-white/80 bg-white/85 p-4 shadow-ui-md backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Today</p><p className="text-sm font-bold text-[var(--text-primary)]">Your first schedule</p></div>
          <span className="rounded-full bg-[var(--success-soft)] px-2 py-1 text-[10px] font-bold text-[var(--success)]">Ready soon</span>
        </div>
        <div className="grid grid-cols-[42px_1fr] gap-x-3 gap-y-2">
          {['10:00', '10:30', '11:00', '11:30'].map((time, index) => (
            <React.Fragment key={time}>
              <span className="pt-2 text-right text-[10px] text-[var(--text-muted)]">{time}</span>
              <span className={cx('h-9 rounded-ui-sm border', index === 1 ? 'border-[var(--brand-border)] bg-[var(--brand-soft)]' : 'border-[var(--line)] bg-[var(--bg-soft)]/60')} />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>

    <div className="border-t border-[var(--line)] px-5 py-6 sm:px-8 md:px-10 md:py-8">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand)]">Finish calendar setup</p>
        <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)]">Two quick steps before your first booking</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SetupStep complete={hasServices} href="/menu" icon={<Scissors className="h-5 w-5" aria-hidden />} number={1} title="Add your services" description="Set treatment names, durations and prices so BookGlow can calculate appointment slots." action="Set up services" />
        <SetupStep complete={hasStaff} href="/staff" icon={<UsersRound className="h-5 w-5" aria-hidden />} number={2} title="Add staff and working hours" description="Create your team calendar and define when each person is available for bookings." action="Set up your team" />
      </div>
    </div>
  </section>
);

export default ScheduleSetupState;
