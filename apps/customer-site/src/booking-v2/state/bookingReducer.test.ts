import { describe, it, expect } from 'vitest';
import { bookingReducer } from './bookingReducer';
import { createInitialBookingState } from './bookingInitialState';
import type { BookingV2State, MerchantSummary, SelectedService } from './bookingTypes';

function merchant(outletId: string): MerchantSummary {
  return {
    outletId,
    bookingPath: outletId,
    merchantName: 'M',
    outletName: 'O',
    logoUrl: null,
    coverImageUrl: null,
    address: null,
    phone: null,
    shortDescription: null,
    accentColor: null,
  };
}

const serviceA: SelectedService = {
  id: 'svc-a',
  name: 'A',
  price: 10,
  durationMinutes: 30,
  category: null,
  currency: 'MYR',
};
const serviceB: SelectedService = { ...serviceA, id: 'svc-b', name: 'B' };

/** A fully-populated state, ready to be invalidated. */
function fullState(): BookingV2State {
  let s = createInitialBookingState('shop');
  s = bookingReducer(s, { type: 'SET_MERCHANT', merchant: merchant('outlet_1') });
  s = bookingReducer(s, { type: 'SELECT_SERVICE', service: serviceA });
  s = bookingReducer(s, { type: 'SET_PROFESSIONAL_PREFERENCE', preference: 'specific' });
  s = bookingReducer(s, {
    type: 'SELECT_PROFESSIONAL',
    professional: { id: 'pro-1', name: 'Pro', photoUrl: null },
  });
  s = bookingReducer(s, { type: 'SELECT_DATE', date: '2026-07-20' });
  s = bookingReducer(s, { type: 'SELECT_TIME_SLOT', slot: { time: '10:00', label: '10:00 AM' } });
  s = bookingReducer(s, {
    type: 'UPDATE_CUSTOMER_DETAILS',
    details: { fullName: 'Jane Doe', phone: '0123456789', email: 'jane@example.com' },
  });
  return s;
}

describe('bookingReducer invalidation', () => {
  it('service change clears all dependent selections but preserves customer details', () => {
    const s = fullState();
    const next = bookingReducer(s, { type: 'SELECT_SERVICE', service: serviceB });

    expect(next.selectedService?.id).toBe('svc-b');
    expect(next.professionalPreference).toBeNull();
    expect(next.selectedProfessional).toBeNull();
    expect(next.selectedDate).toBeNull();
    expect(next.selectedTimeSlot).toBeNull();
    expect(next.confirmation).toBeNull();
    expect(next.submissionStatus).toBe('idle');
    // Customer details survive.
    expect(next.customerDetails.fullName).toBe('Jane Doe');
    expect(next.customerDetails.email).toBe('jane@example.com');
  });

  it('professional preference change clears specific professional (when any), date and time', () => {
    const s = fullState();
    const next = bookingReducer(s, { type: 'SET_PROFESSIONAL_PREFERENCE', preference: 'any' });

    expect(next.professionalPreference).toBe('any');
    expect(next.selectedProfessional).toBeNull();
    expect(next.selectedDate).toBeNull();
    expect(next.selectedTimeSlot).toBeNull();
  });

  it('professional change clears date and time', () => {
    const s = fullState();
    const next = bookingReducer(s, {
      type: 'SELECT_PROFESSIONAL',
      professional: { id: 'pro-2', name: 'Pro 2', photoUrl: null },
    });

    expect(next.selectedProfessional?.id).toBe('pro-2');
    expect(next.selectedDate).toBeNull();
    expect(next.selectedTimeSlot).toBeNull();
  });

  it('date change clears time', () => {
    const s = fullState();
    const next = bookingReducer(s, { type: 'SELECT_DATE', date: '2026-07-21' });

    expect(next.selectedDate).toBe('2026-07-21');
    expect(next.selectedTimeSlot).toBeNull();
  });

  it('time change clears confirmation and submission state only', () => {
    const s = fullState();
    const next = bookingReducer(s, { type: 'SELECT_TIME_SLOT', slot: { time: '11:00' } });

    expect(next.selectedTimeSlot?.time).toBe('11:00');
    expect(next.selectedDate).toBe('2026-07-20');
    expect(next.confirmation).toBeNull();
    expect(next.submissionStatus).toBe('idle');
  });

  it('merchant change resets the complete booking selection', () => {
    const s = fullState();
    const next = bookingReducer(s, { type: 'SET_MERCHANT', merchant: merchant('outlet_2') });

    expect(next.outletId).toBe('outlet_2');
    expect(next.selectedService).toBeNull();
    expect(next.professionalPreference).toBeNull();
    expect(next.selectedProfessional).toBeNull();
    expect(next.selectedDate).toBeNull();
    expect(next.selectedTimeSlot).toBeNull();
  });

  it('re-selecting the same service does NOT wipe downstream selections', () => {
    const s = fullState();
    const next = bookingReducer(s, { type: 'SELECT_SERVICE', service: serviceA });
    expect(next.selectedDate).toBe('2026-07-20');
    expect(next.selectedTimeSlot?.time).toBe('10:00');
  });
});

describe('bookingReducer submission transitions', () => {
  it('BEGIN_SUBMISSION -> submitting and clears errors', () => {
    let s = createInitialBookingState('shop');
    s = bookingReducer(s, {
      type: 'SUBMISSION_FAILED',
      error: { scope: 'submission', message: 'x' },
    });
    expect(s.submissionStatus).toBe('failed');
    s = bookingReducer(s, { type: 'BEGIN_SUBMISSION' });
    expect(s.submissionStatus).toBe('submitting');
    expect(s.errors).toHaveLength(0);
  });

  it('SUBMISSION_SUCCEEDED sets confirmation and moves to confirmation stage', () => {
    let s = createInitialBookingState('shop');
    s = bookingReducer(s, { type: 'BEGIN_SUBMISSION' });
    s = bookingReducer(s, {
      type: 'SUBMISSION_SUCCEEDED',
      confirmation: {
        appointmentId: 'appt-1',
        serviceName: 'A',
        date: '2026-07-20',
        time: '10:00',
        professionalName: null,
      },
    });
    expect(s.submissionStatus).toBe('succeeded');
    expect(s.confirmation?.appointmentId).toBe('appt-1');
    expect(s.currentStage).toBe('confirmation');
  });

  it('SUBMISSION_FAILED records an error and clears confirmation', () => {
    let s = createInitialBookingState('shop');
    s = bookingReducer(s, {
      type: 'SUBMISSION_FAILED',
      error: { scope: 'submission', message: 'network' },
    });
    expect(s.submissionStatus).toBe('failed');
    expect(s.confirmation).toBeNull();
    expect(s.errors[0].message).toBe('network');
  });

  it('SUBMISSION_STATUS_UNKNOWN sets unknown', () => {
    let s = createInitialBookingState('shop');
    s = bookingReducer(s, { type: 'BEGIN_SUBMISSION' });
    s = bookingReducer(s, { type: 'SUBMISSION_STATUS_UNKNOWN' });
    expect(s.submissionStatus).toBe('unknown');
  });
});

describe('bookingReducer reset', () => {
  it('RESET_BOOKING restores initial selections but keeps merchant identity', () => {
    const s = fullState();
    const next = bookingReducer(s, { type: 'RESET_BOOKING' });
    const fresh = createInitialBookingState('shop');

    expect(next.selectedService).toBeNull();
    expect(next.currentStage).toBe('service');
    expect(next.customerDetails).toEqual(fresh.customerDetails);
    // Identity preserved.
    expect(next.outletId).toBe('outlet_1');
    expect(next.merchant?.outletId).toBe('outlet_1');
  });
});

describe('bookingReducer SET_BOOKING_NOTES invalidation', () => {
  /** A state carrying a successful confirmation. */
  function confirmedState(): BookingV2State {
    let s = fullState();
    s = bookingReducer(s, { type: 'BEGIN_SUBMISSION' });
    s = bookingReducer(s, {
      type: 'SUBMISSION_SUCCEEDED',
      confirmation: {
        appointmentId: 'appt-1',
        serviceName: 'A',
        date: '2026-07-20',
        time: '10:00',
        professionalName: 'Pro',
      },
    });
    return s;
  }

  it('editing notes clears a previous confirmation and resets submission to editable', () => {
    const s = confirmedState();
    expect(s.confirmation).not.toBeNull();
    expect(s.submissionStatus).toBe('succeeded');

    const next = bookingReducer(s, { type: 'SET_BOOKING_NOTES', notes: 'Please use room 2' });

    expect(next.bookingNotes).toBe('Please use room 2');
    expect(next.confirmation).toBeNull();
    expect(next.submissionStatus).toBe('idle');
    expect(next.errors).toEqual([]);
  });

  it('editing notes preserves service, professional, date, time and customer details', () => {
    const s = confirmedState();
    const next = bookingReducer(s, { type: 'SET_BOOKING_NOTES', notes: 'note' });

    expect(next.selectedService?.id).toBe('svc-a');
    expect(next.professionalPreference).toBe('specific');
    expect(next.selectedProfessional?.id).toBe('pro-1');
    expect(next.selectedDate).toBe('2026-07-20');
    expect(next.selectedTimeSlot?.time).toBe('10:00');
    expect(next.customerDetails.fullName).toBe('Jane Doe');
    expect(next.customerDetails.email).toBe('jane@example.com');
  });
});
