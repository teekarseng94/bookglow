/**
 * Bookglow V2 booking persistence.
 *
 * Unfinished bookings are kept in sessionStorage (NOT localStorage) under a
 * per-path, versioned key. All access goes through this adapter — components
 * never touch sessionStorage directly.
 *
 * Restoration NEVER trusts the parsed blob. It reconstructs a clean initial
 * state and copies only individually-validated fields onto it, so malformed
 * sessionStorage can never inject unexpected shapes or crash the app.
 *
 * Guarantees:
 *  - Version must match exactly; wrong versions are discarded.
 *  - State for a different merchant/path is rejected.
 *  - Every nested record is validated field-by-field; invalid values fall back
 *    to safe defaults (null / empty) rather than being trusted.
 *  - A previous confirmation is never restored as a new editable booking.
 *  - Transient errors are never restored.
 *  - An interrupted `submitting` status restores as `unknown`.
 */
import type {
  BookingStage,
  BookingV2State,
  CustomerDetails,
  MerchantSummary,
  ProfessionalPreference,
  SelectedProfessional,
  SelectedService,
  SelectedTimeSlot,
  SubmissionStatus,
} from './bookingTypes';
import { BOOKING_STAGE_ORDER } from './bookingTypes';
import {
  BOOKING_STATE_VERSION,
  DEFAULT_CURRENCY,
  createInitialBookingState,
  EMPTY_CUSTOMER_DETAILS,
} from './bookingInitialState';
import { earliestIncompleteStage } from './bookingSelectors';

const KEY_PREFIX = 'bookglow:booking-v2';

/** Defensive cap so a corrupted/huge notes field can't bloat state. */
export const MAX_BOOKING_NOTES_LENGTH = 2000;

export function buildStorageKey(bookingPath: string): string {
  return `${KEY_PREFIX}:${bookingPath}:v${BOOKING_STATE_VERSION}`;
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// ---- primitive helpers ------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** Coerce to a string, using a safe empty default when absent/invalid. */
function asSafeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringOrNull(value: unknown): string | null {
  // Explicit null and strings are accepted; everything else becomes null.
  if (value === null) return null;
  return typeof value === 'string' ? value : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(\d{1,2}):(\d{2})$/;

/**
 * Strict calendar-date validation. Rejects impossible dates such as
 * `2026-02-30` by requiring the parsed Date to round-trip to the same
 * year/month/day (native Date otherwise silently rolls over).
 */
function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Time must be a real 24h clock value: 00:00–23:59. */
function isValidTimeString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = TIME_RE.exec(value);
  if (!m) return false;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

// ---- field validators (each returns a safe value) ---------------------------

export function validateStage(value: unknown): BookingStage | null {
  return typeof value === 'string' && (BOOKING_STAGE_ORDER as readonly string[]).includes(value)
    ? (value as BookingStage)
    : null;
}

export function validateProfessionalPreference(value: unknown): ProfessionalPreference | null {
  return value === 'any' || value === 'specific' ? value : null;
}

/**
 * Submission status is never restored as an active `submitting`. An interrupted
 * `submitting` (or a persisted `unknown`) becomes `unknown`; any settled or
 * unrecognised value becomes `idle`, because confirmation/errors are dropped.
 */
export function safeSubmissionStatus(value: unknown): SubmissionStatus {
  return value === 'submitting' || value === 'unknown' ? 'unknown' : 'idle';
}

export function validateMerchant(value: unknown): MerchantSummary | null {
  if (!isRecord(value)) return null;
  const outletId = asString(value.outletId);
  const bookingPath = asString(value.bookingPath);
  // A merchant summary is only meaningful with its identity keys.
  if (!outletId || !bookingPath) return null;
  return {
    outletId,
    bookingPath,
    merchantName: asStringOrNull(value.merchantName),
    outletName: asStringOrNull(value.outletName),
    logoUrl: asStringOrNull(value.logoUrl),
    coverImageUrl: asStringOrNull(value.coverImageUrl),
    address: asStringOrNull(value.address),
    phone: asStringOrNull(value.phone),
    shortDescription: asStringOrNull(value.shortDescription),
    accentColor: asStringOrNull(value.accentColor),
  };
}

export function validateSelectedService(value: unknown): SelectedService | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const name = asString(value.name);
  const price = asFiniteNumber(value.price);
  const durationMinutes = asFiniteNumber(value.durationMinutes);
  if (!id || !name || price === null || durationMinutes === null) return null;
  // A service must have a non-negative price and a positive duration.
  if (price < 0 || durationMinutes <= 0) return null;
  return {
    id,
    name,
    price,
    durationMinutes,
    category: asStringOrNull(value.category),
    // Currency defaults safely when a legacy/absent snapshot omits it.
    currency: asString(value.currency) ?? DEFAULT_CURRENCY,
  };
}

export function validateSelectedProfessional(value: unknown): SelectedProfessional | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const name = asString(value.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    photoUrl: asStringOrNull(value.photoUrl),
  };
}

export function validateSelectedTimeSlot(value: unknown): SelectedTimeSlot | null {
  if (!isRecord(value)) return null;
  const time = asString(value.time);
  if (!time || !isValidTimeString(time)) return null;
  const label = asString(value.label);
  return label ? { time, label } : { time };
}

export function validateSelectedDate(value: unknown): string | null {
  return isValidDateString(value) ? value : null;
}

export function validateCustomerDetails(value: unknown): CustomerDetails {
  if (!isRecord(value)) return { ...EMPTY_CUSTOMER_DETAILS };
  return {
    fullName: asSafeString(value.fullName),
    phone: asSafeString(value.phone),
    email: asSafeString(value.email),
  };
}

export function validateBookingNotes(value: unknown): string {
  const s = asSafeString(value);
  return s.length > MAX_BOOKING_NOTES_LENGTH ? s.slice(0, MAX_BOOKING_NOTES_LENGTH) : s;
}

// ---- restoration ------------------------------------------------------------

type RestoredSelections = Pick<
  BookingV2State,
  | 'selectedService'
  | 'professionalPreference'
  | 'selectedProfessional'
  | 'selectedDate'
  | 'selectedTimeSlot'
>;

/**
 * Enforce the same dependency invalidation the reducer applies, so a restored
 * snapshot can never contain a downstream selection without its prerequisite
 * (e.g. a time without a date, or a professional without a preference).
 */
export function normalizeRestoredSelections(sel: RestoredSelections): RestoredSelections {
  let { selectedService, professionalPreference, selectedProfessional, selectedDate, selectedTimeSlot } =
    sel;

  // No service → nothing downstream is valid.
  if (!selectedService) {
    professionalPreference = null;
    selectedProfessional = null;
    selectedDate = null;
    selectedTimeSlot = null;
  }

  // Preference "any" → a specific professional is not relevant.
  if (professionalPreference === 'any') {
    selectedProfessional = null;
  }

  // No preference → professional, date and time are invalid.
  if (!professionalPreference) {
    selectedProfessional = null;
    selectedDate = null;
    selectedTimeSlot = null;
  }

  // No date → time is invalid.
  if (!selectedDate) {
    selectedTimeSlot = null;
  }

  return { selectedService, professionalPreference, selectedProfessional, selectedDate, selectedTimeSlot };
}

/**
 * Clamp the requested stage so it can never sit ahead of the earliest stage the
 * (normalized) selections have not yet completed. Earlier stages are kept.
 */
export function clampStage(requested: BookingStage, state: BookingV2State): BookingStage {
  const earliest = earliestIncompleteStage(state);
  const requestedIdx = BOOKING_STAGE_ORDER.indexOf(requested);
  const earliestIdx = BOOKING_STAGE_ORDER.indexOf(earliest);
  return requestedIdx > earliestIdx ? earliest : requested;
}

/**
 * Reconstruct a clean, fully-typed booking state from an untrusted candidate.
 * Returns null only when the candidate is not a plausible snapshot for this
 * exact path/version, or its merchant identity conflicts with the route/root.
 * Otherwise a safe, dependency-consistent state is returned — never a blind
 * spread of the parsed object.
 */
export function sanitizeRestoredState(
  candidate: unknown,
  expectedBookingPath: string,
): BookingV2State | null {
  if (!isRecord(candidate)) return null;
  // Version must match exactly — old/unknown schemas are discarded.
  if (candidate.version !== BOOKING_STATE_VERSION) return null;
  // Path must be a string and match the route we are restoring for.
  if (typeof candidate.bookingPath !== 'string') return null;
  if (candidate.bookingPath !== expectedBookingPath) return null;

  const outletId = asStringOrNull(candidate.outletId);
  const merchant = validateMerchant(candidate.merchant);

  // Reject cross-merchant / inconsistent identity outright.
  if (merchant) {
    if (merchant.bookingPath !== expectedBookingPath) return null;
    if (outletId && merchant.outletId !== outletId) return null;
  }

  // Validate raw selections, then enforce dependency consistency.
  const selections = normalizeRestoredSelections({
    selectedService: validateSelectedService(candidate.selectedService),
    professionalPreference: validateProfessionalPreference(candidate.professionalPreference),
    selectedProfessional: validateSelectedProfessional(candidate.selectedProfessional),
    selectedDate: validateSelectedDate(candidate.selectedDate),
    selectedTimeSlot: validateSelectedTimeSlot(candidate.selectedTimeSlot),
  });

  // Start from a clean, valid state and copy ONLY validated fields onto it.
  const restored: BookingV2State = {
    ...createInitialBookingState(expectedBookingPath),
    outletId,
    merchant,
    ...selections,
    customerDetails: validateCustomerDetails(candidate.customerDetails),
    bookingNotes: validateBookingNotes(candidate.bookingNotes),
    submissionStatus: safeSubmissionStatus(candidate.submissionStatus),
    confirmation: null,
    errors: [],
  };

  // Clamp the stage to the earliest incomplete stage of the normalized state.
  // (Confirmation is never restorable since confirmation is always null.)
  restored.currentStage = clampStage(validateStage(candidate.currentStage) ?? 'service', restored);

  return restored;
}

export const bookingPersistence = {
  /** Persist a cleaned snapshot. Errors/submitting are stripped before write. */
  save(state: BookingV2State): void {
    const storage = getStorage();
    if (!storage || !state.bookingPath) return;

    const snapshot: BookingV2State = {
      ...state,
      errors: [],
      submissionStatus:
        state.submissionStatus === 'submitting' ? 'unknown' : state.submissionStatus,
    };

    try {
      storage.setItem(buildStorageKey(state.bookingPath), JSON.stringify(snapshot));
    } catch {
      // Quota / serialization failure — persistence is best-effort.
    }
  },

  /** Load + validate + reconstruct. Returns null when nothing safe is available. */
  load(bookingPath: string): BookingV2State | null {
    const storage = getStorage();
    if (!storage) return null;

    let raw: string | null = null;
    try {
      raw = storage.getItem(buildStorageKey(bookingPath));
    } catch {
      return null;
    }
    if (!raw) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Corrupted JSON — discard.
      this.clear(bookingPath);
      return null;
    }

    const sanitized = sanitizeRestoredState(parsed, bookingPath);
    if (!sanitized) {
      this.clear(bookingPath);
      return null;
    }
    return sanitized;
  },

  clear(bookingPath: string): void {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.removeItem(buildStorageKey(bookingPath));
    } catch {
      // ignore
    }
  },
};

/**
 * Convenience for callers that want a guaranteed state for a path. Never throws
 * — a corrupt snapshot falls back to a fresh initial state.
 */
export function loadOrInit(bookingPath: string): BookingV2State {
  try {
    return bookingPersistence.load(bookingPath) ?? createInitialBookingState(bookingPath);
  } catch {
    return createInitialBookingState(bookingPath);
  }
}
