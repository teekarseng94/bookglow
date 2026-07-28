import React from 'react';
import { StaffEditorSection } from './StaffEditorSection';
<<<<<<< HEAD

export interface StaffScheduleSectionProps {
  children?: React.ReactNode;
}

/**
 * Schedule / availability presentation.
 * No new schedule fields — shows existing outlet-hours guidance unless parent passes content.
 */
export const StaffScheduleSection: React.FC<StaffScheduleSectionProps> = ({ children }) => (
  <StaffEditorSection
    title="Schedule"
    description="Working hours follow outlet operating hours. Per-staff schedules are not edited here."
  >
    {children ?? (
      <div className="rounded-ui-sm border border-[var(--line)] bg-[var(--bg-soft)] px-3 py-2.5 text-xs text-[var(--text-secondary)]">
        Manage outlet hours in Settings → Operating hours.
      </div>
    )}
  </StaffEditorSection>
);
=======
import {
  STAFF_WEEKDAYS,
  emptyWeeklyHours,
  formatShiftLabel,
  normalizeWeeklyHours,
  weekdayLabel,
  type StaffWeeklyHours,
} from '../../utils/staffExtras';
import { cx } from '../ui/cx';

export interface StaffScheduleSectionProps {
  weeklyHours?: StaffWeeklyHours | null;
  onChange?: (hours: StaffWeeklyHours) => void;
  readOnly?: boolean;
  children?: React.ReactNode;
}

export const StaffScheduleSection: React.FC<StaffScheduleSectionProps> = ({
  weeklyHours,
  onChange,
  readOnly,
  children,
}) => {
  const editable = Boolean(onChange) && !readOnly;
  const hours = normalizeWeeklyHours(weeklyHours ?? undefined) || (editable ? emptyWeeklyHours() : undefined);

  const updateDay = (
    day: (typeof STAFF_WEEKDAYS)[number],
    patch: Partial<{ open: string; close: string; isOpen: boolean }>,
  ) => {
    if (!onChange) return;
    const base = normalizeWeeklyHours(weeklyHours ?? undefined) || emptyWeeklyHours();
    const current = base[day] || { open: '10:00', close: '18:00', isOpen: true };
    onChange({
      ...base,
      [day]: { ...current, ...patch },
    });
  };

  return (
    <StaffEditorSection
      title="Schedule"
      description={
        editable
          ? 'Set this staff member’s usual weekly hours. Used for today’s shift on the roster.'
          : 'Usual weekly availability for this team member.'
      }
    >
      {children}
      {!hours ? (
        <div className="rounded-ui-sm border border-[var(--line)] bg-[var(--bg-soft)] px-3 py-2.5 text-xs text-[var(--text-secondary)]">
          Hours not configured yet. Edit this staff member to set a weekly schedule.
          <p className="mt-1 text-[var(--text-muted)]">
            Outlet-wide hours still live in Settings → Operating hours.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {!editable ? (
            <p className="text-xs font-semibold text-[var(--brand)] mb-2">
              Today: {formatShiftLabel(hours)}
            </p>
          ) : null}
          <div className="space-y-1.5">
            {STAFF_WEEKDAYS.map((day) => {
              const slot = hours[day] || { open: '10:00', close: '18:00', isOpen: false };
              return (
                <div
                  key={day}
                  className={cx(
                    'flex flex-nowrap items-center gap-1.5 sm:gap-2 rounded-ui-sm border border-[var(--line)] px-2.5 py-1.5',
                    !slot.isOpen && 'opacity-60 bg-[var(--bg-soft)]',
                  )}
                >
                  <span className="w-8 shrink-0 text-[11px] font-bold text-[var(--text-primary)]">
                    {weekdayLabel(day)}
                  </span>
                  {editable ? (
                    <>
                      <input
                        type="checkbox"
                        checked={slot.isOpen}
                        onChange={(e) => updateDay(day, { isOpen: e.target.checked })}
                        className="shrink-0 rounded border-[var(--line)] text-[var(--brand)] focus:ring-[var(--brand)]"
                        aria-label={`${weekdayLabel(day)} working`}
                      />
                      <input
                        type="time"
                        disabled={!slot.isOpen}
                        value={slot.open}
                        onChange={(e) => updateDay(day, { open: e.target.value })}
                        className="min-h-[32px] min-w-0 flex-1 max-w-[6.5rem] px-1 rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)] text-[11px] font-semibold disabled:opacity-40"
                      />
                      <span className="text-[var(--text-muted)] text-[11px] shrink-0">–</span>
                      <input
                        type="time"
                        disabled={!slot.isOpen}
                        value={slot.close}
                        onChange={(e) => updateDay(day, { close: e.target.value })}
                        className="min-h-[32px] min-w-0 flex-1 max-w-[6.5rem] px-1 rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)] text-[11px] font-semibold disabled:opacity-40"
                      />
                    </>
                  ) : (
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] truncate">
                      {slot.isOpen ? `${slot.open} – ${slot.close}` : 'Off'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {editable ? (
            <button
              type="button"
              onClick={() => onChange?.(emptyWeeklyHours())}
              className="text-[11px] font-bold text-[var(--brand)] hover:underline mt-1"
            >
              Reset to default week (Mon–Fri 10:00–18:00)
            </button>
          ) : null}
        </div>
      )}
    </StaffEditorSection>
  );
};
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda

export default StaffScheduleSection;
