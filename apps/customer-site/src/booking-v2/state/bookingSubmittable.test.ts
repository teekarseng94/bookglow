import { describe, it, expect } from 'vitest';
import {
  isDevFixtureId,
  usesDevFixtures,
  isBookingSubmittable,
} from './bookingSelectors';
import { bookingReducer } from './bookingReducer';
import { createInitialBookingState } from './bookingInitialState';
import type { BookingV2State, MerchantSummary } from './bookingTypes';

function merchant(): MerchantSummary {
  return {
    outletId: 'outlet_1',
    bookingPath: 'shop',
    merchantName: 'M',
    outletName: 'M',
    logoUrl: null,
    coverImageUrl: null,
    address: null,
    phone: null,
    shortDescription: null,
    accentColor: null,
  };
}

/** A review-ready state; `serviceId`/`proId` control fixture vs real ids. */
function reviewReady(serviceId: string, proId: string): BookingV2State {
  let s = createInitialBookingState('shop');
  s = bookingReducer(s, { type: 'SET_MERCHANT', merchant: merchant() });
  s = bookingReducer(s, {
    type: 'SELECT_SERVICE',
    service: { id: serviceId, name: 'S', price: 10, durationMinutes: 30, category: null, currency: 'MYR' },
  });
  s = bookingReducer(s, { type: 'SET_PROFESSIONAL_PREFERENCE', preference: 'specific' });
  s = bookingReducer(s, {
    type: 'SELECT_PROFESSIONAL',
    professional: { id: proId, name: 'P', photoUrl: null },
  });
  s = bookingReducer(s, { type: 'SELECT_DATE', date: '2026-07-20' });
  s = bookingReducer(s, { type: 'SELECT_TIME_SLOT', slot: { time: '10:00' } });
  s = bookingReducer(s, {
    type: 'UPDATE_CUSTOMER_DETAILS',
    details: { fullName: 'Jane Doe', phone: '0123456789', email: '' },
  });
  return s;
}

describe('development fixture protection', () => {
  it('detects the dev fixture id prefix', () => {
    expect(isDevFixtureId('dev-service-1')).toBe(true);
    expect(isDevFixtureId('dev-pro-1')).toBe(true);
    expect(isDevFixtureId('svc_real_123')).toBe(false);
    expect(isDevFixtureId(null)).toBe(false);
    expect(isDevFixtureId(undefined)).toBe(false);
  });

  it('flags a booking that uses placeholder fixtures', () => {
    expect(usesDevFixtures(reviewReady('dev-service-1', 'dev-pro-1'))).toBe(true);
    expect(usesDevFixtures(reviewReady('dev-service-1', 'pro-real'))).toBe(true);
    expect(usesDevFixtures(reviewReady('svc-real', 'pro-real'))).toBe(false);
  });

  it('development fixtures are NOT submittable even when all steps are complete', () => {
    const fixtureBooking = reviewReady('dev-service-1', 'dev-pro-1');
    // All review prerequisites are satisfied...
    expect(fixtureBooking.selectedService).not.toBeNull();
    expect(fixtureBooking.selectedTimeSlot).not.toBeNull();
    // ...but the booking must still be rejected for submission.
    expect(isBookingSubmittable(fixtureBooking)).toBe(false);
  });

  it('a real (non-fixture) complete booking is submittable', () => {
    expect(isBookingSubmittable(reviewReady('svc-real', 'pro-real'))).toBe(true);
  });

  it('an incomplete real booking is not submittable', () => {
    let s = createInitialBookingState('shop');
    s = bookingReducer(s, { type: 'SET_MERCHANT', merchant: merchant() });
    s = bookingReducer(s, {
      type: 'SELECT_SERVICE',
      service: { id: 'svc-real', name: 'S', price: 10, durationMinutes: 30, category: null, currency: 'MYR' },
    });
    expect(isBookingSubmittable(s)).toBe(false);
  });
});
