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
  viewMode, selectedDate, onViewModeChange, onPrev, onNext, onToday, onDateChange, className,
}) => (
  <div className={cx('hidden md:flex items-center gap-3 px-3 py-2 rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)]', className)}>
    <div className="flex shrink-0 items-center gap-1">
      <IconButton label="Previous date" size="sm" variant="outline" onClick={onPrev}>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
      </IconButton>
      <Button variant="secondary" size="sm" onClick={onToday}>Today</Button>
      <IconButton label="Next date" size="sm" variant="outline" onClick={onNext}>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
      </IconButton>
    </div>
    <label className="sr-only" htmlFor="schedule-date-picker">Schedule date</label>
    <input id="schedule-date-picker" type="date" value={selectedDate} onChange={(e) => onDateChange(e.target.value)}
      className="h-10 min-w-[168px] rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)] px-3 text-sm font-semibold text-[var(--text-primary)] focus-visible:shadow-ui-focus-strong" />
    <div className="flex-1" />
    <div className="inline-flex h-10 rounded-ui-sm border border-[var(--line)] bg-[var(--bg-soft)] p-1" role="group" aria-label="Schedule view">
      {(['day', 'week', 'month'] as ScheduleViewMode[]).map((mode) => (
        <button key={mode} type="button" onClick={() => onViewModeChange(mode)}
          className={cx('min-w-[70px] rounded-md px-3 text-xs font-semibold capitalize transition-colors',
            viewMode === mode ? 'bg-[var(--bg-surface)] text-[var(--brand)] shadow-ui-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]')}>
          {mode}
        </button>
      ))}
    </div>
  </div>
);

export default ScheduleToolbar;
