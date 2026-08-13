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
  <div className={cx('m-report-date-bar flex items-center gap-1.5 rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] p-2 shadow-ui-xs sm:gap-3 sm:p-5 sm:justify-between', className)}>
    <div className="m-report-date-bar__mobile flex min-w-0 flex-1 items-center gap-1.5 sm:hidden">
      {onPrev ? (
        <button type="button" className="m-report-date-bar__arrow" onClick={onPrev} aria-label="Previous period">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
      ) : null}
      <label className="m-report-date-bar__date relative min-w-0 flex-1">
        <span className="truncate tabular-nums">{rangeLabel || `${startDate} – ${endDate}`}</span>
        <svg className="h-4 w-4 shrink-0 text-[var(--brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 011 1v14H4V6a1 1 0 011-1z" /></svg>
        <input type="date" value={startDate} onChange={(event) => { onStartDateChange(event.target.value); onEndDateChange(event.target.value); }} aria-label="Report date" />
      </label>
      {onNext ? (
        <button type="button" className="m-report-date-bar__arrow" onClick={onNext} aria-label="Next period">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      ) : null}
      {onOpenFilters ? (
        <button type="button" className="m-report-date-bar__action" onClick={onOpenFilters}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M7 12h10M10 18h4" /></svg>
          <span>Filters</span>
        </button>
      ) : null}
      {onPrint ? (
        <button type="button" className="m-report-date-bar__action" onClick={onPrint}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 9V3h12v6M6 18H4V9h16v9h-2m-12-4h12v7H6v-7z" /></svg>
          <span>Print</span>
        </button>
      ) : null}
    </div>

    <div className="hidden flex-wrap items-center gap-2 sm:flex sm:gap-3">
      {onPrev ? <Button type="button" variant="ghost" size="sm" onClick={onPrev} aria-label="Previous period">‹</Button> : null}
      <span className="min-w-[8rem] text-center text-sm font-bold tabular-nums text-[var(--text-primary)] sm:text-base">{rangeLabel || `${startDate} – ${endDate}`}</span>
      {onNext ? <Button type="button" variant="ghost" size="sm" onClick={onNext} aria-label="Next period">›</Button> : null}
      {onPrint ? <Button type="button" variant="secondary" size="sm" onClick={onPrint}>Print</Button> : null}
    </div>
    {title ? <h2 className="hidden text-app-section font-bold text-[var(--text-primary)] sm:block">{title}</h2> : null}
    <div className="hidden grid-cols-2 gap-2 sm:grid sm:w-auto sm:min-w-[280px]">
      <label className="block">
        <span className="m-settings-label block uppercase tracking-widest">From</span>
        <input type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} className="m-settings-control w-full outline-none" />
      </label>
      <label className="block">
        <span className="m-settings-label block uppercase tracking-widest">To</span>
        <input type="date" value={endDate} onChange={(event) => onEndDateChange(event.target.value)} className="m-settings-control w-full outline-none" />
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

export const ReportFiltersSheet: React.FC<ReportFiltersSheetProps> = ({ open, onClose, children, title = 'Filters' }) => (
  <Sheet open={open} onClose={onClose} title={title} side="bottom" footer={<Button fullWidth variant="primary" onClick={onClose}>Apply</Button>}>
    {children}
  </Sheet>
);

export default ReportDateRangeBar;
