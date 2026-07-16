import React from 'react';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { cx } from '../ui/cx';

export type ScheduleViewMode = 'day' | 'week' | 'month';

export interface ScheduleToolbarProps {
  viewMode: ScheduleViewMode;
  selectedDate: string;
  onViewModeChange: (mode: ScheduleViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onDateChange: (iso: string) => void;
  className?: string;
}

export const ScheduleToolbar: React.FC<ScheduleToolbarProps> = ({
  viewMode,
  selectedDate,
  onViewModeChange,
  onPrev,
  onNext,
  onToday,
  onDateChange,
  className,
}) => (
  <div
    className={cx(
      'hidden md:flex flex-col xl:flex-row xl:items-center gap-3',
      'px-4 py-3 rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)]',
      className,
    )}
  >
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="inline-flex p-1 rounded-ui-sm bg-[var(--bg-soft)] border border-[var(--line)]"
        role="group"
        aria-label="Schedule view"
      >
        {(['day', 'week', 'month'] as ScheduleViewMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onViewModeChange(mode)}
            className={cx(
              'px-3 py-1.5 rounded-md text-app-label font-bold uppercase tracking-wider transition-colors',
              viewMode === mode
                ? 'bg-[var(--bg-surface)] text-[var(--brand)] shadow-ui-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            )}
          >
            {mode}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <IconButton label="Previous" size="sm" variant="outline" onClick={onPrev}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </IconButton>
        <Button variant="secondary" size="sm" onClick={onToday}>
          Today
        </Button>
        <IconButton label="Next" size="sm" variant="outline" onClick={onNext}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </IconButton>
      </div>
    </div>
    <div className="flex-1" />
    <label className="sr-only" htmlFor="schedule-date-picker">
      Schedule date
    </label>
    <input
      id="schedule-date-picker"
      type="date"
      className="h-10 px-3 rounded-ui-sm border border-[var(--line-strong)] bg-[var(--bg-soft)] text-sm font-semibold text-[var(--text-primary)] focus-visible:shadow-ui-focus-strong"
      value={selectedDate}
      onChange={(e) => onDateChange(e.target.value)}
    />
  </div>
);

export default ScheduleToolbar;
