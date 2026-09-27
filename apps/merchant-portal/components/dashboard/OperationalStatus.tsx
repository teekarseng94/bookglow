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
      <div className="m-quick-actions" data-testid="m-quick-actions">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            className="m-quick-action"
          >
            {action.icon ? <span className="m-quick-action__icon">{action.icon}</span> : null}
            <span className="m-quick-action__label">{action.label}</span>
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
