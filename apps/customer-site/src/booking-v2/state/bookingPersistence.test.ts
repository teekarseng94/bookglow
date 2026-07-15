import { describe, it, expect, beforeEach } from 'vitest';
import {
  bookingPersistence,
  buildStorageKey,
  sanitizeRestoredState,
} from './bookingPersistence';
import { createInitialBookingState, BOOKING_STATE_VERSION } from './bookingInitialState';
import type { BookingV2State } from './bookingTypes';

function stateFor(path: string): BookingV2State {
  return {
    ...createInitialBookingState(path),
    selectedService: { id: 's', name: 'S', price: 1, durationMinutes: 30, category: null, currency: 'MYR' },
    currentStage: 'professional',
  };
}

describe('bookingPersistence', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('saves and restores a valid state for the same path', () => {
    const s = stateFor('shopA');
    bookingPersistence.save(s);

    const restored = bookingPersistence.load('shopA');
    expect(restored).not.toBeNull();
    expect(restored?.selectedService?.id).toBe('s');
    expect(restored?.currentStage).toBe('professional');
  });

  it('rejects state stored under a different merchant/path', () => {
    const s = stateFor('shopA');
    // Corrupt the key so a load for shopB would find shopA's payload.
    window.sessionStorage.setItem(buildStorageKey('shopB'), JSON.stringify(s));

    const restored = bookingPersistence.load('shopB');
    expect(restored).toBeNull();
  });

  it('ignores invalid JSON and clears it', () => {
    window.sessionStorage.setItem(buildStorageKey('shopA'), '{not valid json');
    const restored = bookingPersistence.load('shopA');
    expect(restored).toBeNull();
    expect(window.sessionStorage.getItem(buildStorageKey('shopA'))).toBeNull();
  });

  it('rejects an old schema version safely', () => {
    const stale = { ...stateFor('shopA'), version: BOOKING_STATE_VERSION - 1 };
    window.sessionStorage.setItem(buildStorageKey('shopA'), JSON.stringify(stale));
    const restored = bookingPersistence.load('shopA');
    expect(restored).toBeNull();
  });

  it('does not restore a submitting state as an active submission', () => {
    const s: BookingV2State = { ...stateFor('shopA'), submissionStatus: 'submitting' };
    bookingPersistence.save(s);
    const restored = bookingPersistence.load('shopA');
    expect(restored?.submissionStatus).toBe('unknown');
  });

  it('never restores a persisted confirmation as an editable booking', () => {
    const s: BookingV2State = {
      ...stateFor('shopA'),
      currentStage: 'confirmation',
      submissionStatus: 'succeeded',
      confirmation: {
        appointmentId: 'a1',
        serviceName: 'S',
        date: '2026-07-20',
        time: '10:00',
        professionalName: null,
      },
    };
    // Write raw (save would keep succeeded/confirmation); load must sanitize.
    window.sessionStorage.setItem(buildStorageKey('shopA'), JSON.stringify(s));

    const restored = bookingPersistence.load('shopA');
    expect(restored?.confirmation).toBeNull();
    expect(restored?.currentStage).not.toBe('confirmation');
    expect(restored?.submissionStatus).toBe('idle');
  });

  it('sanitizeRestoredState drops transient errors', () => {
    const s: BookingV2State = {
      ...stateFor('shopA'),
      errors: [{ scope: 'general', message: 'boom' }],
    };
    const sanitized = sanitizeRestoredState(s, 'shopA');
    expect(sanitized?.errors).toEqual([]);
  });

  it('sanitizeRestoredState rejects non-object and wrong-path input', () => {
    expect(sanitizeRestoredState(null, 'shopA')).toBeNull();
    expect(sanitizeRestoredState(42, 'shopA')).toBeNull();
    expect(sanitizeRestoredState(stateFor('shopA'), 'shopB')).toBeNull();
  });
});

/** A fully-populated, valid persisted snapshot (as a plain record). */
function fullValidStored(path: string): Record<string, unknown> {
  return {
    version: BOOKING_STATE_VERSION,
    bookingPath: path,
    outletId: 'outlet_9',
    merchant: {
      outletId: 'outlet_9',
      bookingPath: path,
      merchantName: 'Bali Wellness',
      outletName: 'Bali Wellness',
      logoUrl: null,
      coverImageUrl: null,
      address: null,
      phone: null,
      accentColor: null,
    },
    selectedService: { id: 'svc-1', name: 'Facial', price: 80, durationMinutes: 45, category: 'Face' },
    professionalPreference: 'specific',
    selectedProfessional: { id: 'pro-1', name: 'Susi', photoUrl: null },
    selectedDate: '2026-07-20',
    selectedTimeSlot: { time: '10:00', label: '10:00 AM' },
    customerDetails: { fullName: 'Jane Doe', phone: '0123456789', email: 'jane@example.com' },
    bookingNotes: 'window seat',
    currentStage: 'details',
    submissionStatus: 'idle',
    confirmation: null,
    errors: [],
  };
}

describe('bookingPersistence hardened validation (reconstruction)', () => {
  it('restores a fully valid snapshot field-by-field', () => {
    const r = sanitizeRestoredState(fullValidStored('shopA'), 'shopA');
    expect(r).not.toBeNull();
    expect(r?.outletId).toBe('outlet_9');
    expect(r?.merchant?.merchantName).toBe('Bali Wellness');
    expect(r?.selectedService?.id).toBe('svc-1');
    expect(r?.professionalPreference).toBe('specific');
    expect(r?.selectedProfessional?.name).toBe('Susi');
    expect(r?.selectedDate).toBe('2026-07-20');
    expect(r?.selectedTimeSlot?.label).toBe('10:00 AM');
    expect(r?.customerDetails.email).toBe('jane@example.com');
    expect(r?.bookingNotes).toBe('window seat');
    expect(r?.currentStage).toBe('details');
  });

  it('reconstructs clean state and does not copy unknown extra properties', () => {
    const withJunk = { ...fullValidStored('shopA'), evil: 'x', __proto__hack: 1 };
    const r = sanitizeRestoredState(withJunk, 'shopA') as unknown as Record<string, unknown>;
    expect(r).not.toBeNull();
    expect('evil' in r).toBe(false);
    expect('__proto__hack' in r).toBe(false);
  });

  it('rejects an invalid merchant object (-> null) but keeps other fields', () => {
    const stored = { ...fullValidStored('shopA'), merchant: { merchantName: 'no id' } };
    const r = sanitizeRestoredState(stored, 'shopA');
    expect(r?.merchant).toBeNull();
    expect(r?.selectedService?.id).toBe('svc-1');
  });

  it('rejects an invalid selected service (missing numeric fields) -> null', () => {
    const stored = { ...fullValidStored('shopA'), selectedService: { id: 'x', name: 'y' } };
    const r = sanitizeRestoredState(stored, 'shopA');
    expect(r?.selectedService).toBeNull();
  });

  it('rejects an invalid professional preference -> null', () => {
    const stored = { ...fullValidStored('shopA'), professionalPreference: 'whoever' };
    const r = sanitizeRestoredState(stored, 'shopA');
    expect(r?.professionalPreference).toBeNull();
  });

  it('rejects an invalid professional object -> null', () => {
    const stored = { ...fullValidStored('shopA'), selectedProfessional: { name: 'no id' } };
    const r = sanitizeRestoredState(stored, 'shopA');
    expect(r?.selectedProfessional).toBeNull();
  });

  it('rejects an invalid date string -> null', () => {
    const stored = { ...fullValidStored('shopA'), selectedDate: '20th July' };
    const r = sanitizeRestoredState(stored, 'shopA');
    expect(r?.selectedDate).toBeNull();
  });

  it('rejects an invalid time slot -> null', () => {
    const stored = { ...fullValidStored('shopA'), selectedTimeSlot: { time: 'noon' } };
    const r = sanitizeRestoredState(stored, 'shopA');
    expect(r?.selectedTimeSlot).toBeNull();
  });

  it('handles invalid customer details with safe empty defaults', () => {
    const stored = { ...fullValidStored('shopA'), customerDetails: { fullName: 5, phone: null } };
    const r = sanitizeRestoredState(stored, 'shopA');
    expect(r?.customerDetails).toEqual({ fullName: '', phone: '', email: '' });
  });

  it('coerces non-string booking notes to empty and caps very long notes', () => {
    const num = sanitizeRestoredState({ ...fullValidStored('shopA'), bookingNotes: 123 }, 'shopA');
    expect(num?.bookingNotes).toBe('');
    const long = sanitizeRestoredState(
      { ...fullValidStored('shopA'), bookingNotes: 'x'.repeat(5000) },
      'shopA',
    );
    expect(long?.bookingNotes.length).toBe(2000);
  });

  it('defaults an invalid current stage to a valid stage', () => {
    const stored = { ...fullValidStored('shopA'), currentStage: 'nowhere' };
    const r = sanitizeRestoredState(stored, 'shopA');
    expect(r?.currentStage).toBe('service');
  });

  it('resets an invalid/settled submission status to idle', () => {
    const bogus = sanitizeRestoredState({ ...fullValidStored('shopA'), submissionStatus: 'weird' }, 'shopA');
    expect(bogus?.submissionStatus).toBe('idle');
    const failed = sanitizeRestoredState({ ...fullValidStored('shopA'), submissionStatus: 'failed' }, 'shopA');
    expect(failed?.submissionStatus).toBe('idle');
  });

  it('never restores confirmation or errors even if present in storage', () => {
    const stored = {
      ...fullValidStored('shopA'),
      confirmation: { appointmentId: 'a1', serviceName: 'S', date: '2026-07-20', time: '10:00', professionalName: null },
      errors: [{ scope: 'submission', message: 'boom' }],
    };
    const r = sanitizeRestoredState(stored, 'shopA');
    expect(r?.confirmation).toBeNull();
    expect(r?.errors).toEqual([]);
  });

  it('load() never throws on malformed storage and returns null', () => {
    window.sessionStorage.setItem(buildStorageKey('shopA'), JSON.stringify({ version: 'x', bookingPath: 5 }));
    expect(() => bookingPersistence.load('shopA')).not.toThrow();
    expect(bookingPersistence.load('shopA')).toBeNull();
  });
});

describe('bookingPersistence merchant-identity conflicts', () => {
  it('rejects when merchant.bookingPath does not match the expected path', () => {
    const stored = {
      ...fullValidStored('shopA'),
      merchant: { ...(fullValidStored('shopA').merchant as object), bookingPath: 'other-shop' },
    };
    expect(sanitizeRestoredState(stored, 'shopA')).toBeNull();
  });

  it('rejects when merchant.outletId conflicts with the root outletId', () => {
    const stored = {
      ...fullValidStored('shopA'),
      outletId: 'outlet_9',
      merchant: { ...(fullValidStored('shopA').merchant as object), outletId: 'outlet_DIFFERENT' },
    };
    expect(sanitizeRestoredState(stored, 'shopA')).toBeNull();
  });

  it('accepts when merchant identity is consistent with path and root outletId', () => {
    const r = sanitizeRestoredState(fullValidStored('shopA'), 'shopA');
    expect(r).not.toBeNull();
    expect(r?.merchant?.outletId).toBe('outlet_9');
  });
});

describe('bookingPersistence dependency normalization on restore', () => {
  it('clears preference, professional, date and time when there is no service', () => {
    const stored = { ...fullValidStored('shopA'), selectedService: null };
    const r = sanitizeRestoredState(stored, 'shopA');
    expect(r?.selectedService).toBeNull();
    expect(r?.professionalPreference).toBeNull();
    expect(r?.selectedProfessional).toBeNull();
    expect(r?.selectedDate).toBeNull();
    expect(r?.selectedTimeSlot).toBeNull();
  });

  it("clears the specific professional when preference is 'any'", () => {
    const stored = { ...fullValidStored('shopA'), professionalPreference: 'any' };
    const r = sanitizeRestoredState(stored, 'shopA');
    expect(r?.professionalPreference).toBe('any');
    expect(r?.selectedProfessional).toBeNull();
    // date/time survive because 'any' is a valid preference
    expect(r?.selectedDate).toBe('2026-07-20');
    expect(r?.selectedTimeSlot?.time).toBe('10:00');
  });

  it('clears professional, date and time when there is no preference', () => {
    const stored = { ...fullValidStored('shopA'), professionalPreference: null };
    const r = sanitizeRestoredState(stored, 'shopA');
    expect(r?.professionalPreference).toBeNull();
    expect(r?.selectedProfessional).toBeNull();
    expect(r?.selectedDate).toBeNull();
    expect(r?.selectedTimeSlot).toBeNull();
  });

  it('clears the time when there is no date', () => {
    const stored = { ...fullValidStored('shopA'), selectedDate: null };
    const r = sanitizeRestoredState(stored, 'shopA');
    expect(r?.selectedDate).toBeNull();
    expect(r?.selectedTimeSlot).toBeNull();
  });

  it('clamps a current stage that is ahead of the completed selections', () => {
    // No service at all, but stage claims 'review' -> clamp back to 'service'.
    const stored = { ...fullValidStored('shopA'), selectedService: null, currentStage: 'review' };
    const r = sanitizeRestoredState(stored, 'shopA');
    expect(r?.currentStage).toBe('service');
  });

  it('keeps an earlier current stage even when later stages are complete', () => {
    const stored = { ...fullValidStored('shopA'), currentStage: 'service' };
    const r = sanitizeRestoredState(stored, 'shopA');
    expect(r?.currentStage).toBe('service');
  });
});

describe('bookingPersistence strict field validation', () => {
  it('rejects an impossible calendar date (2026-02-30) -> null', () => {
    const r = sanitizeRestoredState({ ...fullValidStored('shopA'), selectedDate: '2026-02-30' }, 'shopA');
    expect(r?.selectedDate).toBeNull();
    // time is cleared once date is gone
    expect(r?.selectedTimeSlot).toBeNull();
  });

  it('accepts a real leap day (2028-02-29)', () => {
    const r = sanitizeRestoredState({ ...fullValidStored('shopA'), selectedDate: '2028-02-29' }, 'shopA');
    expect(r?.selectedDate).toBe('2028-02-29');
  });

  it('rejects out-of-range times (24:00, 12:60) -> null time slot', () => {
    const a = sanitizeRestoredState({ ...fullValidStored('shopA'), selectedTimeSlot: { time: '24:00' } }, 'shopA');
    expect(a?.selectedTimeSlot).toBeNull();
    const b = sanitizeRestoredState({ ...fullValidStored('shopA'), selectedTimeSlot: { time: '12:60' } }, 'shopA');
    expect(b?.selectedTimeSlot).toBeNull();
  });

  it('accepts boundary times 00:00 and 23:59', () => {
    const a = sanitizeRestoredState({ ...fullValidStored('shopA'), selectedTimeSlot: { time: '00:00' } }, 'shopA');
    expect(a?.selectedTimeSlot?.time).toBe('00:00');
    const b = sanitizeRestoredState({ ...fullValidStored('shopA'), selectedTimeSlot: { time: '23:59' } }, 'shopA');
    expect(b?.selectedTimeSlot?.time).toBe('23:59');
  });

  it('rejects a service with a negative price -> null (and clears downstream)', () => {
    const stored = {
      ...fullValidStored('shopA'),
      selectedService: { id: 's', name: 'S', price: -1, durationMinutes: 30, category: null },
    };
    const r = sanitizeRestoredState(stored, 'shopA');
    expect(r?.selectedService).toBeNull();
    expect(r?.professionalPreference).toBeNull();
    expect(r?.selectedDate).toBeNull();
  });

  it('accepts a free service (price 0)', () => {
    const stored = {
      ...fullValidStored('shopA'),
      selectedService: { id: 's', name: 'S', price: 0, durationMinutes: 30, category: null },
    };
    expect(sanitizeRestoredState(stored, 'shopA')?.selectedService?.price).toBe(0);
  });

  it('rejects a service with non-positive duration -> null', () => {
    const zero = {
      ...fullValidStored('shopA'),
      selectedService: { id: 's', name: 'S', price: 10, durationMinutes: 0, category: null },
    };
    expect(sanitizeRestoredState(zero, 'shopA')?.selectedService).toBeNull();
    const neg = {
      ...fullValidStored('shopA'),
      selectedService: { id: 's', name: 'S', price: 10, durationMinutes: -5, category: null },
    };
    expect(sanitizeRestoredState(neg, 'shopA')?.selectedService).toBeNull();
  });

  it('preserves a restored service currency and defaults it when absent', () => {
    const withCurrency = {
      ...fullValidStored('shopA'),
      selectedService: { id: 's', name: 'S', price: 10, durationMinutes: 30, category: null, currency: 'SGD' },
    };
    expect(sanitizeRestoredState(withCurrency, 'shopA')?.selectedService?.currency).toBe('SGD');

    const noCurrency = {
      ...fullValidStored('shopA'),
      selectedService: { id: 's', name: 'S', price: 10, durationMinutes: 30, category: null },
    };
    expect(sanitizeRestoredState(noCurrency, 'shopA')?.selectedService?.currency).toBe('MYR');
  });
});
