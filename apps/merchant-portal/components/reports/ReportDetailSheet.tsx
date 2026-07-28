import React from 'react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { StatusBadge, type StatusTone } from '../ui/StatusBadge';
import { cx } from '../ui/cx';

export interface ReportDetailRow {
  label: string;
  value: React.ReactNode;
}

export interface ReportDetailSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  amountLabel: string;
  amountClassName?: string;
  statusLabel: string;
  statusTone?: StatusTone;
  rows: ReportDetailRow[];
  breakdown?: React.ReactNode;
  primaryAction?: { label: string; onClick: () => void; disabled?: boolean };
  dangerAction?: { label: string; onClick: () => void; disabled?: boolean };
  className?: string;
}

/** Responsive detail sheet for a selected transaction. Parent supplies actions. */
export const ReportDetailSheet: React.FC<ReportDetailSheetProps> = ({
  open,
  onClose,
  title = 'Transaction Details',
  amountLabel,
  amountClassName,
  statusLabel,
  statusTone = 'neutral',
  rows,
  breakdown,
  primaryAction,
  dangerAction,
  className,
}) => (
  <Sheet
    open={open}
    onClose={onClose}
    title={title}
    side="bottom"
    className={cx('md:hidden', className)}
    footer={
      primaryAction || dangerAction ? (
        <div className="flex gap-3">
          {primaryAction ? (
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              disabled={primaryAction.disabled}
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
          ) : null}
          {dangerAction ? (
            <Button
              type="button"
              variant="danger"
              className="flex-1"
              disabled={dangerAction.disabled}
              onClick={dangerAction.onClick}
            >
              {dangerAction.label}
            </Button>
          ) : null}
        </div>
      ) : undefined
    }
  >
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
        <span className={cx('m-txn-amount text-xl tabular-nums', amountClassName)}>{amountLabel}</span>
      </div>
      <div className="space-y-2.5 pt-1">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 text-sm">
            <span className="text-[var(--text-muted)] font-semibold flex-shrink-0">{row.label}</span>
            <span className="text-[var(--text-primary)] font-bold text-right break-words min-w-0">
              {row.value}
            </span>
          </div>
        ))}
      </div>
      {breakdown}
    </div>
  </Sheet>
);

export default ReportDetailSheet;
