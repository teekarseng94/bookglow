import type { BookingV2State, CustomerDetails } from './bookingTypes';

/** Bump when the persisted BookingV2State shape changes incompatibly. */
export const BOOKING_STATE_VERSION = 1;

/** Default outlet currency (Bookglow merchants are MYR / RM today). */
export const DEFAULT_CURRENCY = 'MYR';

export const EMPTY_CUSTOMER_DETAILS: CustomerDetails = {
  fullName: '',
  phone: '',
  email: '',
};

export function createInitialBookingState(bookingPath: string | null = null): BookingV2State {
  return {
    version: BOOKING_STATE_VERSION,
    bookingPath,
    outletId: null,
    merchant: null,
    selectedService: null,
    professionalPreference: null,
    selectedProfessional: null,
    selectedDate: null,
    selectedTimeSlot: null,
    customerDetails: { ...EMPTY_CUSTOMER_DETAILS },
    bookingNotes: '',
    currentStage: 'service',
    submissionStatus: 'idle',
    confirmation: null,
    errors: [],
  };
}
