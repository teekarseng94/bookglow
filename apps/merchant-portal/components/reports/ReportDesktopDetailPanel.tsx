import React from 'react';
import { Button } from '../ui/Button';
import { StatusBadge, type StatusTone } from '../ui/StatusBadge';
import { cx } from '../ui/cx';
import type { ReportDetailRow } from './ReportDetailSheet';

interface Props {
  title?: string;
  amountLabel: string;
  amountClassName?: string;
  statusLabel: string;
  statusTone?: StatusTone;
  transactionId: string;
  rows: ReportDetailRow[];
  breakdown?: React.ReactNode;
  onClose: () => void;
  primaryAction?: { label: string; onClick: () => void; disabled?: boolean };
  dangerAction?: { label: string; onClick: () => void; disabled?: boolean };
}

export const ReportDesktopDetailPanel: React.FC<Props> = ({
  title = 'Transaction Details',
  amountLabel,
  amountClassName,
  statusLabel,
  statusTone = 'neutral',
  transactionId,
  rows,
  breakdown,
  onClose,
  primaryAction,
  dangerAction,
}) => (
  <aside className="hidden h-[calc(100vh-8rem)] w-[380px] shrink-0 flex-col overflow-hidden rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] md:flex">
    <header className="border-b border-[var(--line)] px-4 py-4">
      <div className="flex items-center gap-3">
        <h2 className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--text-primary)]">{title}</h2>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-ui-xs text-xl text-[var(--text-muted)] hover:bg-[var(--bg-soft)]" aria-label="Close transaction details">×</button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
      </div>
      <p className={cx('mt-3 text-xl font-bold tabular-nums', amountClassName)}>{amountLabel}</p>
      <div className="mt-2 flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[11px] text-[var(--text-muted)]">Transaction ID: {transactionId}</p>
        <button type="button" onClick={() => navigator.clipboard?.writeText(transactionId)} className="text-[11px] font-semibold text-[var(--brand)]">Copy</button>
      </div>
    </header>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      <section className="rounded-ui-md border border-[var(--line)] p-4">
        <h3 className="mb-3 text-xs font-bold text-[var(--text-primary)]">Transaction Information</h3>
        <dl className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 text-xs">
              <dt className="shrink-0 text-[var(--text-muted)]">{row.label}</dt>
              <dd className="min-w-0 break-words text-right font-semibold text-[var(--text-primary)]">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      {breakdown ? <section className="rounded-ui-md border border-[var(--line)] p-4">{breakdown}</section> : null}
    </div>
    {primaryAction || dangerAction ? (
      <footer className="grid grid-cols-2 gap-2 border-t border-[var(--line)] bg-[var(--bg-surface)] p-4">
        {primaryAction ? <Button variant="outline" disabled={primaryAction.disabled} onClick={primaryAction.onClick}>{primaryAction.label}</Button> : null}
        {dangerAction ? <Button variant="danger" disabled={dangerAction.disabled} onClick={dangerAction.onClick}>{dangerAction.label}</Button> : null}
      </footer>
    ) : null}
  </aside>
);

export default ReportDesktopDetailPanel;
