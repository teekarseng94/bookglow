/**
 * DateTimeStage — real calendar-style date selection + governed time-slot grid.
 *
 * Dates come from an accessible month grid; times load per-day through the
 * availability adapter (sample data until the real availability API is
 * connected — visibly marked). Changing the date clears the time via the
 * reducer. Loading, closed, empty, and error/retry states are all governed.
 */
import React, { useState } from 'react';
import { useBooking } from '../state/BookingProvider';
import { hasDateTime } from '../state/bookingSelectors';
import type { TimeSlotOption } from '../data/availability';
import {
  addMonths,
  formatLongDate,
  isSameMonth,
  parseLocalISO,
  startOfMonth,
} from '../utils/dates';
import { CalendarMonth } from '../components/datetime/CalendarMonth';
import { TimeSlotGrid } from '../components/datetime/TimeSlotGrid';
import { useAvailability } from './useAvailability';
import { StageActions } from './StageActions';

export default function DateTimeStage() {
  const { state, dispatch } = useBooking();

  const serviceId = state.selectedService?.id ?? null;
  const staffId =
    state.professionalPreference === 'specific'
      ? state.selectedProfessional?.id ?? null
      : null;

  const [month, setMonth] = useState<Date>(() =>
    state.selectedDate ? startOfMonth(parseLocalISO(state.selectedDate)) : startOfMonth(new Date()),
  );

  const availability = useAvailability(state.outletId, serviceId, staffId, state.selectedDate);

  const today = new Date();
  const currentMonth = startOfMonth(today);
  const canGoPrev = !isSameMonth(month, currentMonth);

  const selectDate = (iso: string) => dispatch({ type: 'SELECT_DATE', date: iso });
  const selectSlot = (slot: TimeSlotOption) =>
    dispatch({ type: 'SELECT_TIME_SLOT', slot: { time: slot.time, label: slot.label } });

  const selectedTime = state.selectedTimeSlot?.time ?? null;

  const liveMessage = !state.selectedDate
    ? 'Choose a date to see available times.'
    : state.selectedTimeSlot
      ? `Selected ${formatLongDate(state.selectedDate)} at ${state.selectedTimeSlot.label ?? state.selectedTimeSlot.time}.`
      : `Showing times for ${formatLongDate(state.selectedDate)}.`;

  const renderSlots = () => {
    if (!state.selectedDate) {
      return (
        <p className="bgv2-supporting" role="status">
          Select a date to see available times.
        </p>
      );
    }

    if (availability.status === 'loading') {
      return (
        <div className="bgv2-slot-grid" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="bgv2-skeleton bgv2-skeleton-slot" />
          ))}
        </div>
      );
    }

    if (availability.status === 'error') {
      return (
        <div className="bgv2-empty" role="alert">
          <p className="bgv2-empty-title">Couldn't load times</p>
          <p className="bgv2-supporting">Please try again in a moment.</p>
          <button type="button" className="bgv2-btn bgv2-btn--primary" onClick={availability.retry}>
            Retry
          </button>
        </div>
      );
    }

    if (availability.closed) {
      return (
        <div className="bgv2-empty" role="status">
          <p className="bgv2-empty-title">Closed on this date</p>
          <p className="bgv2-supporting">Please choose another day.</p>
        </div>
      );
    }

    if (availability.slots.length === 0) {
      return (
        <div className="bgv2-empty" role="status">
          <p className="bgv2-empty-title">No times available</p>
          <p className="bgv2-supporting">This date is fully booked — try another day.</p>
        </div>
      );
    }

    return (
      <>
        <TimeSlotGrid
          slots={availability.slots}
          selectedTime={selectedTime}
          onSelect={selectSlot}
        />
        {availability.isSample && (
          <p className="bgv2-sample-note" role="note">
            Preview schedule — sample times shown for design review.
          </p>
        )}
      </>
    );
  };

  return (
    <section className="bgv2-content" aria-labelledby="bgv2-datetime-heading">
      <div className="bgv2-surface bgv2-discovery">
        <h1 id="bgv2-datetime-heading" className="bgv2-section-title">
          Pick a date &amp; time
        </h1>

        <div className="bgv2-datetime-grid">
          <CalendarMonth
            month={month}
            selectedDate={state.selectedDate}
            minDate={today}
            onSelectDate={selectDate}
            onPrevMonth={() => canGoPrev && setMonth((m) => addMonths(m, -1))}
            onNextMonth={() => setMonth((m) => addMonths(m, 1))}
            canGoPrev={canGoPrev}
          />

          <div className="bgv2-slot-panel">
            <h2 className="bgv2-slot-heading">
              {state.selectedDate ? formatLongDate(state.selectedDate) : 'Available times'}
            </h2>
            {renderSlots()}
          </div>
        </div>
      </div>

      <p className="bgv2-visually-hidden" aria-live="polite">
        {liveMessage}
      </p>

      <StageActions stage="date-time" canContinue={hasDateTime(state)} />
    </section>
  );
}
