import { describe, it, expect } from 'vitest';
import { resolveStageRedirect } from './guardLogic';
import { earliestIncompleteStage } from '../state/bookingSelectors';
import { bookingReducer } from '../state/bookingReducer';
import { createInitialBookingState } from '../state/bookingInitialState';
import type { BookingStage, BookingV2State, MerchantSummary } from '../state/bookingTypes';

function merchant(): MerchantSummary {
  return {
    outletId: 'outlet_1',
    bookingPath: 'shop',
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

/** Build state satisfying prerequisites up to (but not including) `stopBefore`. */
function stateUpTo(stopBefore: BookingStage): BookingV2State {
  let s = createInitialBookingState('shop');
  s = bookingReducer(s, { type: 'SET_MERCHANT', merchant: merchant() });
  if (stopBefore === 'service') return s;

  s = bookingReducer(s, {
    type: 'SELECT_SERVICE',
    service: { id: 's', name: 'S', price: 1, durationMinutes: 30, category: null, currency: 'MYR' },
  });
  if (stopBefore === 'professional') return s;

  s = bookingReducer(s, { type: 'SET_PROFESSIONAL_PREFERENCE', preference: 'any' });
  if (stopBefore === 'date-time') return s;

  s = bookingReducer(s, { type: 'SELECT_DATE', date: '2026-07-20' });
  s = bookingReducer(s, { type: 'SELECT_TIME_SLOT', slot: { time: '10:00' } });
  if (stopBefore === 'details') return s;

  s = bookingReducer(s, {
    type: 'UPDATE_CUSTOMER_DETAILS',
    details: { fullName: 'Jane Doe', phone: '0123456789', email: '' },
  });
  if (stopBefore === 'review') return s;

  s = bookingReducer(s, {
    type: 'SUBMISSION_SUCCEEDED',
    confirmation: {
      appointmentId: 'a1',
      serviceName: 'S',
      date: '2026-07-20',
      time: '10:00',
      professionalName: null,
    },
  });
  return s;
}

const STAGES: BookingStage[] = [
  'service',
  'professional',
  'date-time',
  'details',
  'review',
  'confirmation',
];

describe('resolveStageRedirect — valid access', () => {
  it('allows each stage when its prerequisites are met', () => {
    for (const stage of STAGES) {
      const state = stateUpTo(stage === 'confirmation' ? 'confirmation' : stage);
      // Build a state that fully satisfies `stage`.
      const satisfying = fullySatisfy(stage);
      expect(resolveStageRedirect(stage, satisfying)).toBeNull();
    }
  });
});

/** State that satisfies the prerequisites to ENTER the given stage. */
function fullySatisfy(stage: BookingStage): BookingV2State {
  switch (stage) {
    case 'service':
      return stateUpTo('service');
    case 'professional':
      return stateUpTo('professional');
    case 'date-time':
      return stateUpTo('date-time');
    case 'details':
      return stateUpTo('details');
    case 'review':
      return stateUpTo('review');
    case 'confirmation':
      return stateUpTo('confirmation');
  }
}

describe('resolveStageRedirect — redirects to earliest incomplete stage', () => {
  it('redirects a fresh (merchant-only) state to the service stage', () => {
    const s = stateUpTo('service'); // merchant present, nothing selected
    expect(resolveStageRedirect('service', s)).toBeNull();
    expect(resolveStageRedirect('professional', s)).toBe('service');
    expect(resolveStageRedirect('date-time', s)).toBe('service');
    expect(resolveStageRedirect('details', s)).toBe('service');
    expect(resolveStageRedirect('review', s)).toBe('service');
    expect(resolveStageRedirect('confirmation', s)).toBe('service');
  });

  it('sends details/review to date-time when time is missing', () => {
    let s = stateUpTo('date-time'); // service + preference done, no date/time
    expect(resolveStageRedirect('date-time', s)).toBeNull();
    expect(resolveStageRedirect('details', s)).toBe('date-time');
    expect(resolveStageRedirect('review', s)).toBe('date-time');
  });

  it('confirmation cannot be opened without confirmation data', () => {
    const s = stateUpTo('review'); // everything valid, but not submitted
    const redirect = resolveStageRedirect('confirmation', s);
    expect(redirect).not.toBeNull();
    expect(redirect).not.toBe('confirmation');
    // With review complete but no submission, the earliest incomplete stage is
    // 'review' — so an over-reach to confirmation lands back on review.
    expect(redirect).toBe('review');
    expect(earliestIncompleteStage(s)).toBe('review');
  });

  it('confirmation IS accessible once a successful confirmation exists', () => {
    const s = stateUpTo('confirmation');
    expect(resolveStageRedirect('confirmation', s)).toBeNull();
  });
});
