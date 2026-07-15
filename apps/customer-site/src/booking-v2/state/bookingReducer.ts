/**
 * Bookglow V2 booking reducer.
 *
 * Dependency invalidation (Volume VI) is enforced HERE, centrally — screens
 * never clear downstream state themselves. Changing an upstream selection
 * automatically clears everything derived from it plus any confirmation and
 * submission state.
 */
import {
  BOOKING_STAGE_ORDER,
  type BookingAction,
  type BookingV2State,
} from './bookingTypes';
import { createInitialBookingState, EMPTY_CUSTOMER_DETAILS } from './bookingInitialState';

/**
 * Clear confirmation + submission outcome — always invalidated when any part of
 * the booking request changes. Also drops stale submission errors, since the
 * only errors recorded are submission-scoped (see SUBMISSION_FAILED).
 */
function clearOutcome(
  state: BookingV2State,
): Pick<BookingV2State, 'confirmation' | 'submissionStatus' | 'errors'> {
  return { confirmation: null, submissionStatus: 'idle', errors: [] };
}

/** Clear the chosen time slot (and downstream outcome). */
function clearFromTime(state: BookingV2State): Partial<BookingV2State> {
  return {
    selectedTimeSlot: null,
    ...clearOutcome(state),
  };
}

/** Clear date + time (and downstream outcome). */
function clearFromDate(state: BookingV2State): Partial<BookingV2State> {
  return {
    selectedDate: null,
    ...clearFromTime(state),
  };
}

/** Clear the specific professional + date + time (and outcome). */
function clearFromProfessional(state: BookingV2State): Partial<BookingV2State> {
  return {
    selectedProfessional: null,
    ...clearFromDate(state),
  };
}

/** Clear professional preference + everything below it (and outcome). */
function clearFromPreference(state: BookingV2State): Partial<BookingV2State> {
  return {
    professionalPreference: null,
    ...clearFromProfessional(state),
  };
}

export function bookingReducer(state: BookingV2State, action: BookingAction): BookingV2State {
  switch (action.type) {
    case 'INITIALIZE_BOOKING': {
      // Starting a booking for a different path resets everything.
      if (state.bookingPath && state.bookingPath !== action.bookingPath) {
        return createInitialBookingState(action.bookingPath);
      }
      return { ...state, bookingPath: action.bookingPath };
    }

    case 'SET_MERCHANT': {
      // Merchant/outlet change => reset the complete booking selection.
      // Never preserve a service, professional or slot across merchants.
      if (state.outletId && state.outletId !== action.merchant.outletId) {
        const fresh = createInitialBookingState(action.merchant.bookingPath);
        return {
          ...fresh,
          outletId: action.merchant.outletId,
          merchant: action.merchant,
        };
      }
      return {
        ...state,
        bookingPath: action.merchant.bookingPath,
        outletId: action.merchant.outletId,
        merchant: action.merchant,
      };
    }

    case 'SELECT_SERVICE': {
      // Service change clears preference, professional, date, time, outcome.
      // Customer details are preserved.
      const changed = state.selectedService?.id !== action.service.id;
      if (!changed) {
        return { ...state, selectedService: action.service };
      }
      return {
        ...state,
        selectedService: action.service,
        ...clearFromPreference(state),
      };
    }

    case 'SET_PROFESSIONAL_PREFERENCE': {
      const changed = state.professionalPreference !== action.preference;
      // When preference is 'any', a previously-selected specific professional
      // is no longer relevant and must be cleared.
      const selectedProfessional =
        action.preference === 'any' ? null : state.selectedProfessional;
      if (!changed) {
        return { ...state, professionalPreference: action.preference, selectedProfessional };
      }
      return {
        ...state,
        professionalPreference: action.preference,
        selectedProfessional,
        ...clearFromDate(state),
      };
    }

    case 'SELECT_PROFESSIONAL': {
      const changed = state.selectedProfessional?.id !== action.professional.id;
      if (!changed) {
        return { ...state, selectedProfessional: action.professional };
      }
      return {
        ...state,
        selectedProfessional: action.professional,
        ...clearFromDate(state),
      };
    }

    case 'SELECT_DATE': {
      const changed = state.selectedDate !== action.date;
      if (!changed) {
        return { ...state, selectedDate: action.date };
      }
      return {
        ...state,
        selectedDate: action.date,
        ...clearFromTime(state),
      };
    }

    case 'SELECT_TIME_SLOT': {
      const changed = state.selectedTimeSlot?.time !== action.slot.time;
      if (!changed) {
        return { ...state, selectedTimeSlot: action.slot };
      }
      return {
        ...state,
        selectedTimeSlot: action.slot,
        ...clearOutcome(state),
      };
    }

    case 'UPDATE_CUSTOMER_DETAILS': {
      return {
        ...state,
        customerDetails: { ...state.customerDetails, ...action.details },
        // Editing details invalidates a prior confirmation/submission only.
        ...clearOutcome(state),
      };
    }

    case 'SET_BOOKING_NOTES': {
      // Notes are part of the booking request, so editing them invalidates any
      // existing confirmation/submission outcome (but not the selections).
      return {
        ...state,
        bookingNotes: action.notes,
        ...clearOutcome(state),
      };
    }

    case 'GO_TO_STAGE': {
      if (!BOOKING_STAGE_ORDER.includes(action.stage)) return state;
      return { ...state, currentStage: action.stage };
    }

    case 'BEGIN_SUBMISSION': {
      return { ...state, submissionStatus: 'submitting', errors: [] };
    }

    case 'SUBMISSION_SUCCEEDED': {
      return {
        ...state,
        submissionStatus: 'succeeded',
        confirmation: action.confirmation,
        currentStage: 'confirmation',
        errors: [],
      };
    }

    case 'SUBMISSION_FAILED': {
      return {
        ...state,
        submissionStatus: 'failed',
        confirmation: null,
        errors: [action.error],
      };
    }

    case 'SUBMISSION_STATUS_UNKNOWN': {
      return { ...state, submissionStatus: 'unknown' };
    }

    case 'RESET_BOOKING': {
      // Preserve identity (path/outlet/merchant) but clear the whole journey.
      const fresh = createInitialBookingState(state.bookingPath);
      return {
        ...fresh,
        outletId: state.outletId,
        merchant: state.merchant,
        customerDetails: { ...EMPTY_CUSTOMER_DETAILS },
      };
    }

    case 'RESTORE_BOOKING': {
      return action.state;
    }

    default: {
      // Exhaustiveness guard — unknown actions leave state untouched.
      return state;
    }
  }
}
