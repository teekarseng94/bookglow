/**
 * CalendarMonth — accessible month-grid date picker.
 *
 * Buttons for each day (44px targets), past days disabled, selected day marked
 * with aria-pressed + a text ring (not colour alone: selected day also gets the
 * accent-contrast foreground). Month navigation cannot go before the current
 * month. Every day button has a full-date aria-label.
 */
import React from 'react';
import {
  daysInMonth,
  formatLocalISO,
  formatLongDate,
  formatMonthLabel,
  isBeforeDay,
  parseLocalISO,
} from '../../utils/dates';

interface Props {
  /** First day of the displayed month. */
  month: Date;
  selectedDate: string | null;
  /** Earliest selectable day (usually today). */
  minDate: Date;
  onSelectDate: (iso: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoPrev: boolean;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarMonth({
  month,
  selectedDate,
  minDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  canGoPrev,
}: Props) {
  const total = daysInMonth(month);
  // Monday-first offset: getDay() 0=Sun..6=Sat -> 0=Mon..6=Sun.
  const firstWeekday = (month.getDay() + 6) % 7;
  const selected = selectedDate ? parseLocalISO(selectedDate) : null;
  const todayISO = formatLocalISO(new Date());

  const cells: Array<Date | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: total }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];

  return (
    <div className="bgv2-calendar" aria-label="Choose a date">
      <div className="bgv2-calendar-header">
        <button
          type="button"
          className="bgv2-calendar-nav"
          onClick={onPrevMonth}
          disabled={!canGoPrev}
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="bgv2-calendar-month" aria-live="polite">
          {formatMonthLabel(month)}
        </p>
        <button
          type="button"
          className="bgv2-calendar-nav"
          onClick={onNextMonth}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="bgv2-calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="bgv2-calendar-days">
        {cells.map((day, i) => {
          if (!day) {
            return <span key={`blank-${i}`} aria-hidden="true" />;
          }
          const iso = formatLocalISO(day);
          const disabled = isBeforeDay(day, minDate);
          const isSelected =
            selected !== null && selected.getTime() === day.getTime();
          const isToday = iso === todayISO;
          return (
            <button
              key={iso}
              type="button"
              className={`bgv2-calendar-day${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`}
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={formatLongDate(iso)}
              onClick={() => onSelectDate(iso)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
