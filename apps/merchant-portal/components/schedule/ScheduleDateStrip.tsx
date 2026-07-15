import React from 'react';
import { cx } from '../ui/cx';

export interface ScheduleDateStripProps {
  weekDates: string[];
  visibleDate: string;
  todayIso: string;
  dayInitials: readonly string[];
  monthLabel: string;
  shopInitial: string;
  onOpenMenu: () => void;
  onOpenMonthPicker: () => void;
  onSelectDate: (iso: string) => void;
  className?: string;
}

export const ScheduleDateStrip: React.FC<ScheduleDateStripProps> = ({
  weekDates,
  visibleDate,
  todayIso,
  dayInitials,
  monthLabel,
  shopInitial,
  onOpenMenu,
  onOpenMonthPicker,
  onSelectDate,
  className,
}) => (
  <div
    className={cx(
      'md:hidden sticky top-0 z-30 bg-[var(--bg-surface)] border-b border-[var(--line)]',
      className,
    )}
  >
    <div className="flex items-center justify-between px-2 h-14">
      <button
        type="button"
        onClick={onOpenMenu}
        className="w-11 h-11 flex items-center justify-center rounded-ui-sm text-[var(--text-primary)] active:bg-[var(--bg-soft)]"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onOpenMonthPicker}
        className="flex items-center gap-1 px-2 py-1 rounded-ui-sm active:bg-[var(--bg-soft)] min-w-0"
        aria-label="Open month calendar"
      >
        <span className="text-[22px] leading-none font-semibold tracking-tight text-[var(--text-primary)] truncate">
          {monthLabel}
        </span>
        <svg className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <span className="w-9 h-9 rounded-full bg-[var(--bg-soft)] text-[var(--text-secondary)] text-xs font-bold flex items-center justify-center">
        {shopInitial}
      </span>
    </div>
    <div className="grid grid-cols-7 px-1.5 pb-2" role="listbox" aria-label="Week dates">
      {weekDates.map((iso, i) => {
        const isSel = iso === visibleDate;
        const isToday = iso === todayIso;
        return (
          <button
            key={iso}
            type="button"
            role="option"
            aria-selected={isSel}
            onClick={() => onSelectDate(iso)}
            className="flex flex-col items-center gap-1.5 py-1"
          >
            <span className="text-[12px] font-medium text-[var(--text-muted)]">{dayInitials[i]}</span>
            <span
              className={cx(
                'w-9 h-9 rounded-ui-sm flex items-center justify-center text-[16px] font-medium transition-colors',
                isSel
                  ? 'bg-[var(--text-primary)] text-white'
                  : isToday
                    ? 'text-[var(--brand)] font-bold'
                    : 'text-[var(--text-primary)]',
              )}
            >
              {new Date(iso).getUTCDate()}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

export default ScheduleDateStrip;
