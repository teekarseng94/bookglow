import React from 'react';
import { Calendar } from 'lucide-react';
import { cx } from '../ui/cx';

export interface OperationalAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

export interface OperationalStatusProps {
  title?: string;
  actions?: OperationalAction[];
  calendarHeader?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/** Staff / operational status — quick actions + calendar chrome; parent owns timetable data. */
export const OperationalStatus: React.FC<OperationalStatusProps> = ({
  title = 'Operational status',
  actions,
  calendarHeader,
  children,
  className,
}) => (
  <section className={cx('space-y-2 sm:space-y-3', className)}>
    <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
      <Calendar className="h-4 w-4" aria-hidden />
      {title}
    </h2>
    {actions && actions.length > 0 ? (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] px-2 py-2 hover:border-[var(--brand)] hover:bg-[var(--brand-soft)] focus-visible:shadow-ui-focus-strong sm:min-h-[4.5rem] sm:gap-1.5 sm:py-3"
          >
            {action.icon ? (
              <span className="grid h-8 w-8 place-items-center rounded-ui-sm bg-[var(--brand-soft)] text-[var(--brand)] sm:h-10 sm:w-10">
                {action.icon}
              </span>
            ) : null}
            <span className="text-center text-xs font-semibold leading-tight text-[var(--text-secondary)]">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    ) : null}
    <div className="hidden lg:block bg-[var(--bg-surface)] p-4 sm:p-6 rounded-ui-lg border border-[var(--line)] shadow-ui-xs">
      {calendarHeader}
      {children}
    </div>
  </section>
);

export default OperationalStatus;
