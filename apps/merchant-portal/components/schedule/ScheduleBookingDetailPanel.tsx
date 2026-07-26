import React from 'react';
import { AppDrawer, AppSheet, Button } from '../ui';
import { cx } from '../ui/cx';

export type ScheduleDetailTab = 'details' | 'payments' | 'history';

export interface ScheduleBookingDetailPanelProps {
  open: boolean;
  serviceName: string;
  servicePriceLabel: string;
  serviceDurationLabel: string;
  dateTimeLabel: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  staffName: string;
  bookingId: string;
  status: string;
  reminderSent: boolean;
  sourceLabel: string;
  accentDotClassName?: string;
  isCompleted: boolean;
  detailTab: ScheduleDetailTab;
  actionsOpen: boolean;
  reminderEnabled: boolean;
  onClose: () => void;
  onOpenActions: () => void;
  onCloseActions: () => void;
  onTabChange: (tab: ScheduleDetailTab) => void;
  onCollectPayment: () => void;
  onCopyBookingId: () => void;
  onMarkCompleted: () => void;
  onMarkScheduled: () => void;
  onMarkNoShow: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onSendReminder?: () => void;
}

/**
 * Mobile full-width booking detail — AppDrawer + AppSheet actions.
 */
export const ScheduleBookingDetailPanel: React.FC<ScheduleBookingDetailPanelProps> = ({
  open,
  serviceName,
  servicePriceLabel,
  serviceDurationLabel,
  dateTimeLabel,
  customerName,
  customerEmail,
  customerPhone,
  staffName,
  bookingId,
  status,
  reminderSent,
  sourceLabel,
  accentDotClassName,
  isCompleted,
  detailTab,
  actionsOpen,
  reminderEnabled,
  onClose,
  onOpenActions,
  onCloseActions,
  onTabChange,
  onCollectPayment,
  onCopyBookingId,
  onMarkCompleted,
  onMarkScheduled,
  onMarkNoShow,
  onCancel,
  onDelete,
  onSendReminder,
}) => (
  <>
    <AppDrawer
      open={open}
      onClose={onClose}
      title="Overview"
      variant="fullscreen"
      zIndexClass="z-[90] md:hidden"
      headerActions={
        <button
          type="button"
          onClick={onOpenActions}
          aria-label="More options"
          className="min-w-[44px] min-h-[44px] grid place-items-center rounded-ui-sm text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="5" r="1.75" />
            <circle cx="12" cy="12" r="1.75" />
            <circle cx="12" cy="19" r="1.75" />
          </svg>
        </button>
      }
      footer={
        isCompleted ? (
          <div className="w-full py-3 rounded-ui-sm bg-[var(--bg-soft)] text-[var(--text-muted)] font-semibold text-center text-sm">
            Completed
          </div>
        ) : (
          <Button fullWidth onClick={onCollectPayment}>
            Collect payment
          </Button>
        )
      }
    >
      <div className="flex border-b border-[var(--line)] -mx-4 sm:-mx-5 px-4 sm:px-5 mb-4">
        {(['details', 'payments', 'history'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={cx(
              'flex-1 py-3 text-sm font-medium capitalize border-b-2 -mb-px transition-colors',
              detailTab === tab
                ? 'border-[var(--brand)] text-[var(--brand)]'
                : 'border-transparent text-[var(--text-muted)]',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {detailTab === 'details' && (
        <div className="space-y-5">
          <div className="flex gap-3">
            <span className={cx('mt-1.5 w-3 h-3 rounded-full flex-shrink-0', accentDotClassName)} />
            <div className="min-w-0">
              <p className="text-base font-semibold text-[var(--text-primary)] leading-snug">{serviceName}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-0.5 mt-1 text-sm text-[var(--text-secondary)]">
                <span>
                  Cost: <span className="font-semibold text-[var(--text-primary)]">{servicePriceLabel}</span>
                </span>
                <span>
                  Duration:{' '}
                  <span className="font-semibold text-[var(--text-primary)]">{serviceDurationLabel}</span>
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{dateTimeLabel}</p>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{customerName}</p>
            {customerEmail ? (
              <p className="text-sm text-[var(--text-muted)] truncate">{customerEmail}</p>
            ) : null}
            {customerPhone ? <p className="text-sm text-[var(--text-muted)]">{customerPhone}</p> : null}
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{staffName}</p>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Booked from {sourceLabel}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-[var(--text-muted)] truncate">Booking ID: {bookingId}</p>
              <button
                type="button"
                onClick={onCopyBookingId}
                aria-label="Copy booking ID"
                className="text-xs font-semibold text-[var(--brand)]"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
      {detailTab === 'payments' && (
        <div className="py-10 text-center space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            {isCompleted ? 'This appointment is marked completed.' : 'No payment recorded yet.'}
          </p>
          {!isCompleted ? (
            <Button variant="primary" onClick={onCollectPayment}>
              Collect payment
            </Button>
          ) : null}
        </div>
      )}
      {detailTab === 'history' && (
        <div className="py-2 divide-y divide-[var(--line)]">
          <div className="flex justify-between py-3 text-sm">
            <span className="text-[var(--text-muted)]">Current status</span>
            <span className="font-semibold text-[var(--text-primary)] capitalize">{status}</span>
          </div>
          <div className="flex justify-between py-3 text-sm">
            <span className="text-[var(--text-muted)]">Reminder</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {reminderSent ? 'Sent' : 'Not sent'}
            </span>
          </div>
          <div className="flex justify-between py-3 text-sm">
            <span className="text-[var(--text-muted)]">Source</span>
            <span className="font-semibold text-[var(--text-primary)]">{sourceLabel}</span>
          </div>
        </div>
      )}
    </AppDrawer>

    <AppSheet
      open={open && actionsOpen}
      onClose={onCloseActions}
      title="Booking actions"
      zIndexClass="z-[95] md:hidden"
      footer={
        <Button fullWidth variant="secondary" onClick={onCloseActions}>
          Close
        </Button>
      }
    >
      <div className="space-y-1 -mx-1">
        <button
          type="button"
          onClick={onMarkCompleted}
          className="w-full text-left px-3 py-3 rounded-ui-md text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
        >
          Mark completed
        </button>
        <button
          type="button"
          onClick={onMarkScheduled}
          className="w-full text-left px-3 py-3 rounded-ui-md text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
        >
          Mark scheduled
        </button>
        <button
          type="button"
          onClick={onMarkNoShow}
          className="w-full text-left px-3 py-3 rounded-ui-md text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
        >
          Mark no-show
        </button>
        {reminderEnabled && status === 'scheduled' && onSendReminder ? (
          <button
            type="button"
            onClick={onSendReminder}
            className="w-full text-left px-3 py-3 rounded-ui-md text-sm font-semibold text-[var(--brand)] hover:bg-[var(--brand-soft)]"
          >
            {reminderSent ? 'Resend reminder' : 'Send reminder'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-left px-3 py-3 rounded-ui-md text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
        >
          Cancel appointment
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="w-full text-left px-3 py-3 rounded-ui-md text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
        >
          Delete appointment
        </button>
      </div>
    </AppSheet>
  </>
);

export default ScheduleBookingDetailPanel;
