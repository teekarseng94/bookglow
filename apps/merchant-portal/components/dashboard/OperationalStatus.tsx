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
  <section className={cx('space-y-3', className)}>
    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
      <Calendar className="w-4 h-4" />
      {title}
    </h3>
    {actions && actions.length > 0 ? (
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            className="flex flex-col items-center gap-1.5 py-3 px-2 bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] hover:border-[var(--brand)] hover:bg-[var(--brand-soft)] active:scale-95 transition-all min-h-[72px]"
          >
            {action.icon ? <span className="text-xl">{action.icon}</span> : null}
            <span className="text-[10px] font-bold text-[var(--text-secondary)] leading-tight text-center">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    ) : null}
    <div className="bg-[var(--bg-surface)] p-4 sm:p-6 rounded-ui-lg border border-[var(--line)] shadow-ui-xs">
      {calendarHeader}
      {children}
    </div>
  </section>
);

export default OperationalStatus;
