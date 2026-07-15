/**
 * Bookglow V2 booking state — typed model.
 *
 * One typed source of truth for the V2 journey. Only the *public snapshot*
 * fields needed to display and submit a booking are stored here — never whole
 * Firestore documents.
 */

/** Ordered booking journey stages. Never use raw stage strings elsewhere. */
export type BookingStage =
  | 'service'
  | 'professional'
  | 'date-time'
  | 'details'
  | 'review'
  | 'confirmation';

/** Canonical stage order (drives progress, guards and redirects). */
export const BOOKING_STAGE_ORDER: readonly BookingStage[] = [
  'service',
  'professional',
  'date-time',
  'details',
  'review',
  'confirmation',
];

export type SubmissionStatus =
  | 'idle'
  | 'submitting'
  | 'succeeded'
  | 'failed'
  | 'unknown';

export type ProfessionalPreference = 'any' | 'specific';

/** Public merchant/outlet snapshot shown in the V2 shell. */
export interface MerchantSummary {
  outletId: string;
  bookingPath: string;
  merchantName: string | null;
  outletName: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  address: string | null;
  phone: string | null;
  /** Short public description of the merchant, or null when unset. */
  shortDescription: string | null;
  /** Public accent colour (hex) or null when the merchant has no theme yet. */
  accentColor: string | null;
}

/**
 * Public snapshot of a bookable service. Only customer-facing fields — never
 * internal merchant-only data (points, commission, redeem config, etc.).
 */
export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  durationMinutes: number;
  price: number;
  currency: string;
  imageUrl: string | null;
  isActive: boolean;
  isPubliclyBookable: boolean;
  sortOrder: number | null;
}

export interface SelectedService {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  category: string | null;
  currency: string;
}

export interface SelectedProfessional {
  id: string;
  name: string;
  photoUrl: string | null;
}

export interface SelectedTimeSlot {
  /** "HH:mm" 24h start time. */
  time: string;
  /** Optional label for display (e.g. "5:00 PM"). */
  label?: string;
}

export interface CustomerDetails {
  fullName: string;
  phone: string;
  email: string;
}

export interface BookingConfirmation {
  appointmentId: string;
  /** Snapshot of what was booked, captured at submission time. */
  serviceName: string;
  date: string;
  time: string;
  professionalName: string | null;
}

export interface BookingStateError {
  /** Machine-readable scope so UI can place the message contextually. */
  scope: 'merchant' | 'service' | 'professional' | 'date-time' | 'details' | 'submission' | 'general';
  message: string;
}

export interface BookingV2State {
  /** Persistence schema version. Bump when the shape changes incompatibly. */
  version: number;

  bookingPath: string | null;
  outletId: string | null;

  merchant: MerchantSummary | null;

  selectedService: SelectedService | null;

  professionalPreference: ProfessionalPreference | null;
  selectedProfessional: SelectedProfessional | null;

  selectedDate: string | null; // YYYY-MM-DD
  selectedTimeSlot: SelectedTimeSlot | null;

  customerDetails: CustomerDetails;
  bookingNotes: string;

  currentStage: BookingStage;

  submissionStatus: SubmissionStatus;

  confirmation: BookingConfirmation | null;

  errors: BookingStateError[];
}

/** Discriminated union of every booking action. */
export type BookingAction =
  | { type: 'INITIALIZE_BOOKING'; bookingPath: string }
  | { type: 'SET_MERCHANT'; merchant: MerchantSummary }
  | { type: 'SELECT_SERVICE'; service: SelectedService }
  | { type: 'SET_PROFESSIONAL_PREFERENCE'; preference: ProfessionalPreference }
  | { type: 'SELECT_PROFESSIONAL'; professional: SelectedProfessional }
  | { type: 'SELECT_DATE'; date: string }
  | { type: 'SELECT_TIME_SLOT'; slot: SelectedTimeSlot }
  | { type: 'UPDATE_CUSTOMER_DETAILS'; details: Partial<CustomerDetails> }
  | { type: 'SET_BOOKING_NOTES'; notes: string }
  | { type: 'GO_TO_STAGE'; stage: BookingStage }
  | { type: 'BEGIN_SUBMISSION' }
  | { type: 'SUBMISSION_SUCCEEDED'; confirmation: BookingConfirmation }
  | { type: 'SUBMISSION_FAILED'; error: BookingStateError }
  | { type: 'SUBMISSION_STATUS_UNKNOWN' }
  | { type: 'RESET_BOOKING' }
  | { type: 'RESTORE_BOOKING'; state: BookingV2State };
