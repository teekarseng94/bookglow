/**
 * Derived, memo-free selectors over BookingV2State.
 *
 * These encode "is stage X satisfied" so both route guards and screens share
 * one definition of completeness. Pure functions — trivial to unit test.
 */
import type { BookingStage, BookingV2State, CustomerDetails } from './bookingTypes';
import { BOOKING_STAGE_ORDER } from './bookingTypes';

export function hasMerchant(state: BookingV2State): boolean {
  return Boolean(state.merchant && state.outletId);
}

export function hasService(state: BookingV2State): boolean {
  return Boolean(state.selectedService);
}

export function hasProfessionalPreference(state: BookingV2State): boolean {
  if (state.professionalPreference === 'any') return true;
  if (state.professionalPreference === 'specific') {
    return Boolean(state.selectedProfessional);
  }
  return false;
}

export function hasDateTime(state: BookingV2State): boolean {
  return Boolean(state.selectedDate && state.selectedTimeSlot);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isCustomerDetailsValid(details: CustomerDetails): boolean {
  const name = details.fullName.trim();
  const phone = details.phone.trim();
  const email = details.email.trim();
  const emailOk = email === '' || EMAIL_RE.test(email);
  return name.length >= 2 && phone.length >= 6 && emailOk;
}

export function hasValidDetails(state: BookingV2State): boolean {
  return isCustomerDetailsValid(state.customerDetails);
}

export function hasConfirmation(state: BookingV2State): boolean {
  return state.submissionStatus === 'succeeded' && Boolean(state.confirmation);
}

/**
 * Requirement predicate for each stage: are the prerequisites to *enter* this
 * stage satisfied? (The stage's own selection is made while on the stage.)
 */
export function isStageAccessible(stage: BookingStage, state: BookingV2State): boolean {
  switch (stage) {
    case 'service':
      return hasMerchant(state);
    case 'professional':
      return hasMerchant(state) && hasService(state);
    case 'date-time':
      return hasMerchant(state) && hasService(state) && hasProfessionalPreference(state);
    case 'details':
      return (
        hasMerchant(state) &&
        hasService(state) &&
        hasProfessionalPreference(state) &&
        hasDateTime(state)
      );
    case 'review':
      return (
        hasMerchant(state) &&
        hasService(state) &&
        hasProfessionalPreference(state) &&
        hasDateTime(state) &&
        hasValidDetails(state)
      );
    case 'confirmation':
      return hasConfirmation(state);
    default:
      return false;
  }
}

/**
 * Whether the selection that the customer makes ON a given stage has been made.
 * (Distinct from `isStageAccessible`, which is about being *allowed to enter*.)
 * Used to compute the redirect target for deep-links that jump too far ahead.
 */
export function isStageComplete(stage: BookingStage, state: BookingV2State): boolean {
  switch (stage) {
    case 'service':
      return hasService(state);
    case 'professional':
      return hasProfessionalPreference(state);
    case 'date-time':
      return hasDateTime(state);
    case 'details':
      return hasValidDetails(state);
    case 'review':
      // "Review" is only truly done once the booking has been submitted.
      return hasConfirmation(state);
    case 'confirmation':
      return hasConfirmation(state);
    default:
      return false;
  }
}

/**
 * The earliest stage the customer has NOT yet completed — where they should be
 * sent if they jump too far ahead. Walks stages in order and returns the first
 * incomplete one; if everything (including submission) is done, returns
 * 'confirmation'.
 */
export function earliestIncompleteStage(state: BookingV2State): BookingStage {
  for (const stage of BOOKING_STAGE_ORDER) {
    if (!isStageComplete(stage, state)) {
      return stage;
    }
  }
  return 'confirmation';
}

/**
 * Prefix used by the foundation's placeholder fixtures (e.g. `dev-service-1`,
 * `dev-pro-1`). Any record carrying this prefix is a development stand-in and
 * must never reach a real booking API.
 */
export const DEV_FIXTURE_ID_PREFIX = 'dev-';

export function isDevFixtureId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(DEV_FIXTURE_ID_PREFIX);
}

/** True when any current selection is a development placeholder fixture. */
export function usesDevFixtures(state: BookingV2State): boolean {
  return (
    isDevFixtureId(state.selectedService?.id) ||
    isDevFixtureId(state.selectedProfessional?.id)
  );
}

/**
 * Whether the booking is safe to submit to a real API. Requires the review
 * prerequisites to be met AND that no development fixture is selected. During
 * the foundation phase this returns false whenever placeholder records are in
 * play, so fixtures can never be submitted.
 */
export function isBookingSubmittable(state: BookingV2State): boolean {
  if (usesDevFixtures(state)) return false;
  return isStageAccessible('review', state);
}
