import React from 'react';
import { cx } from '../ui/cx';

export interface ReportSummaryItem {
  label: string;
  value: string;
  tone?: 'neutral' | 'in' | 'out' | 'net-positive' | 'net-negative';
}

export interface ReportSummaryStripProps {
  items: ReportSummaryItem[];
  className?: string;
}

const toneClass: Record<NonNullable<ReportSummaryItem['tone']>, string> = {
  neutral: 'text-[var(--text-primary)]',
  in: 'text-[var(--success)]',
  out: 'text-[var(--danger)]',
  'net-positive': 'text-[var(--brand)]',
  'net-negative': 'text-[var(--danger)]',
};

/** Compact totals strip — tabular numerals; parent supplies already-formatted values. */
export const ReportSummaryStrip: React.FC<ReportSummaryStripProps> = ({ items, className }) => (
  <div className={cx('m-card !p-0 grid overflow-hidden rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)]', items.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4', className)}>
    {items.map((item) => (
      <div
        key={item.label}
        className="border-r border-[var(--line)] p-4 text-left last:border-r-0"
      >
        <p className="m-report-summary-label">{item.label}</p>
        <p className={cx('m-report-summary-value mt-1 text-lg sm:text-xl tabular-nums truncate', toneClass[item.tone || 'neutral'])}>
          {item.value}
        </p>
      </div>
    ))}
  </div>
);

export default ReportSummaryStrip;
