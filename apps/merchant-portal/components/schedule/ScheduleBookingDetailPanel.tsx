import React from 'react';
import { Button } from '../ui/Button';
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
 * Mobile full-width booking detail presentation.
 * All actions are callbacks owned by AppointmentsCalendar.
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
}) => {
  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-[90] bg-[var(--bg-surface)] flex flex-col">
      <div className="flex items-center justify-between px-1 h-14 border-b border-[var(--line)] flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-11 h-11 grid place-items-center rounded-ui-sm text-[var(--text-primary)] active:bg-[var(--bg-soft)]"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-[18px] font-bold text-[var(--text-primary)]">Overview</h2>
        <button
          type="button"
          onClick={onOpenActions}
          aria-label="More options"
          className="w-11 h-11 grid place-items-center rounded-ui-sm text-[var(--text-secondary)] active:bg-[var(--bg-soft)]"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="5" r="1.75" />
            <circle cx="12" cy="12" r="1.75" />
            <circle cx="12" cy="19" r="1.75" />
          </svg>
        </button>
      </div>

      <div className="flex px-4 border-b border-[var(--line)] flex-shrink-0">
        {(['details', 'payments', 'history'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={cx(
              'flex-1 py-3 text-[15px] font-medium capitalize border-b-2 -mb-px transition-colors',
              detailTab === tab
                ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-muted)]',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {detailTab === 'details' && (
          <div className="space-y-5">
            <div className="flex gap-3">
              <span className={cx('mt-1.5 w-3 h-3 rounded-full flex-shrink-0', accentDotClassName)} />
              <div className="min-w-0">
                <p className="text-[16px] font-semibold text-[var(--text-primary)] leading-snug">{serviceName}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-0.5 mt-1 text-[14px] text-[var(--text-secondary)]">
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
            <p className="text-[15px] text-[var(--text-secondary)]">{dateTimeLabel}</p>
            <div className="space-y-1">
              <p className="text-[15px] font-semibold text-[var(--text-primary)]">{customerName}</p>
              {customerEmail ? <p className="text-[14px] text-[var(--text-muted)] truncate">{customerEmail}</p> : null}
              {customerPhone ? <p className="text-[14px] text-[var(--text-muted)]">{customerPhone}</p> : null}
            </div>
            <p className="text-[15px] font-medium text-[var(--text-primary)]">{staffName}</p>
            <div>
              <p className="text-[15px] text-[var(--text-secondary)]">Booked from {sourceLabel}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[13px] text-[var(--text-muted)] truncate">Booking ID: {bookingId}</p>
                <button
                  type="button"
                  onClick={onCopyBookingId}
                  aria-label="Copy booking ID"
                  className="text-[var(--text-muted)] active:text-[var(--text-primary)]"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}
        {detailTab === 'payments' && (
          <div className="py-10 text-center space-y-3">
            <p className="text-[15px] text-[var(--text-secondary)]">
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
            <div className="flex justify-between py-3 text-[14px]">
              <span className="text-[var(--text-muted)]">Current status</span>
              <span className="font-semibold text-[var(--text-primary)] capitalize">{status}</span>
            </div>
            <div className="flex justify-between py-3 text-[14px]">
              <span className="text-[var(--text-muted)]">Reminder</span>
              <span className="font-semibold text-[var(--text-primary)]">{reminderSent ? 'Sent' : 'Not sent'}</span>
            </div>
            <div className="flex justify-between py-3 text-[14px]">
              <span className="text-[var(--text-muted)]">Source</span>
              <span className="font-semibold text-[var(--text-primary)]">{sourceLabel}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-[var(--line)] px-4 pt-3 pb-[calc(0.75rem+var(--safe-bottom))] bg-[var(--bg-surface)]">
        {isCompleted ? (
          <div className="w-full py-3 rounded-full bg-[var(--bg-soft)] text-[var(--text-muted)] font-semibold text-center text-[15px]">
            Completed
          </div>
        ) : (
          <Button fullWidth onClick={onCollectPayment}>
            Collect payment
          </Button>
        )}
      </div>

      {actionsOpen ? (
        <div className="absolute inset-0 z-[95] flex flex-col justify-end" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-ui-overlay border-0" aria-label="Close actions" onClick={onCloseActions} />
          <div className="relative bg-[var(--bg-surface)] rounded-t-ui-lg p-4 pb-[calc(1rem+var(--safe-bottom))] shadow-ui-lg">
            <div className="w-10 h-1.5 bg-[var(--line-strong)] rounded-full mx-auto mb-4" />
            <div className="space-y-1">
              <button type="button" onClick={onMarkCompleted} className="w-full text-left px-4 py-3.5 rounded-ui-md text-[15px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]">
                Mark completed
              </button>
              <button type="button" onClick={onMarkScheduled} className="w-full text-left px-4 py-3.5 rounded-ui-md text-[15px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]">
                Mark scheduled
              </button>
              <button type="button" onClick={onMarkNoShow} className="w-full text-left px-4 py-3.5 rounded-ui-md text-[15px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]">
                Mark no-show
              </button>
              {reminderEnabled && status === 'scheduled' && onSendReminder ? (
                <button type="button" onClick={onSendReminder} className="w-full text-left px-4 py-3.5 rounded-ui-md text-[15px] font-semibold text-[var(--brand)] hover:bg-[var(--brand-soft)]">
                  {reminderSent ? 'Resend reminder' : 'Send reminder'}
                </button>
              ) : null}
              <button type="button" onClick={onCancel} className="w-full text-left px-4 py-3.5 rounded-ui-md text-[15px] font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]">
                Cancel appointment
              </button>
              <button type="button" onClick={onDelete} className="w-full text-left px-4 py-3.5 rounded-ui-md text-[15px] font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]">
                Delete appointment
              </button>
            </div>
            <Button fullWidth variant="secondary" className="mt-3" onClick={onCloseActions}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ScheduleBookingDetailPanel;
