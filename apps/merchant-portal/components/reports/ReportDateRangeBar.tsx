import React from 'react';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { cx } from '../ui/cx';

export interface ReportDateRangeBarProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  rangeLabel?: string;
  onPrint?: () => void;
  onOpenFilters?: () => void;
  title?: string;
  className?: string;
}

/** Compact date range + print/filters controls for reporting pages. */
export const ReportDateRangeBar: React.FC<ReportDateRangeBarProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onPrev,
  onNext,
  rangeLabel,
  onPrint,
  onOpenFilters,
  title,
  className,
}) => (
  <div
    className={cx(
      'bg-[var(--bg-surface)] p-4 sm:p-5 rounded-ui-md border border-[var(--line)] shadow-ui-xs',
      'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
      className,
    )}
  >
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {onPrev ? (
        <Button type="button" variant="ghost" size="sm" onClick={onPrev} aria-label="Previous period">
          ‹
        </Button>
      ) : null}
      <span className="text-sm sm:text-base font-bold text-[var(--text-primary)] min-w-[8rem] text-center tabular-nums">
        {rangeLabel || `${startDate} – ${endDate}`}
      </span>
      {onNext ? (
        <Button type="button" variant="ghost" size="sm" onClick={onNext} aria-label="Next period">
          ›
        </Button>
      ) : null}
      {onPrint ? (
        <Button type="button" variant="secondary" size="sm" onClick={onPrint}>
          Print
        </Button>
      ) : null}
      {onOpenFilters ? (
        <Button type="button" variant="secondary" size="sm" className="sm:hidden" onClick={onOpenFilters}>
          Filters
        </Button>
      ) : null}
    </div>
    {title ? <h2 className="text-app-section font-bold text-[var(--text-primary)]">{title}</h2> : null}
    <div className="hidden sm:grid grid-cols-2 gap-2 w-full sm:w-auto sm:min-w-[280px]">
      <label className="block">
        <span className="block text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-1">From</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="w-full p-2.5 bg-[var(--bg-soft)] border border-[var(--line)] rounded-ui-sm text-sm font-semibold outline-none focus-visible:shadow-ui-focus-strong"
        />
      </label>
      <label className="block">
        <span className="block text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-1">To</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="w-full p-2.5 bg-[var(--bg-soft)] border border-[var(--line)] rounded-ui-sm text-sm font-semibold outline-none focus-visible:shadow-ui-focus-strong"
        />
      </label>
    </div>
  </div>
);

export interface ReportFiltersSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const ReportFiltersSheet: React.FC<ReportFiltersSheetProps> = ({
  open,
  onClose,
  children,
  title = 'Filters',
}) => (
  <Sheet
    open={open}
    onClose={onClose}
    title={title}
    side="bottom"
    footer={
      <Button fullWidth variant="primary" onClick={onClose}>
        Apply
      </Button>
    }
  >
    {children}
  </Sheet>
);

export default ReportDateRangeBar;
