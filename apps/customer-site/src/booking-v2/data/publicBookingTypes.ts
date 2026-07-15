/**
 * V2 public-booking data boundary types.
 *
 * The V2 shell + screens depend only on these types, not on Firestore/Cloud
 * Function shapes. This keeps the UI decoupled from the underlying data source.
 */
import type { MerchantSummary, PublicService } from '../state/bookingTypes';

export type { MerchantSummary, PublicService };
// Single source of truth for the default currency lives in the state layer.
export { DEFAULT_CURRENCY } from '../state/bookingInitialState';

/** Discriminated result for loading the public merchant summary. */
export type LoadMerchantResult =
  | { status: 'ok'; merchant: MerchantSummary }
  | { status: 'not-found' }
  // Disabled still carries the merchant so the shell can show contact details.
  | { status: 'disabled'; merchant: MerchantSummary }
  | { status: 'error'; message: string };

/** A service category derived from the public service list. */
export interface ServiceCategory {
  /** Stable key (categoryId when present, else the normalized name). */
  id: string;
  name: string;
  /** Number of visible services in this category. */
  count: number;
}

/** Discriminated result for loading the public service catalogue. */
export type LoadServicesResult =
  | { status: 'ok'; services: PublicService[]; categories: ServiceCategory[] }
  | { status: 'error'; message: string };

/**
 * Public snapshot of a staff member. Only customer-facing fields — never email,
 * phone, or internal data. `qualifiedServices` empty means qualified for all.
 */
export interface PublicStaff {
  id: string;
  name: string;
  role: string | null;
  photoUrl: string | null;
  qualifiedServices: string[];
}

/** Discriminated result for loading public staff. */
export type LoadStaffResult =
  | { status: 'ok'; staff: PublicStaff[] }
  | { status: 'error'; message: string };

/** Governed fallbacks used when a public field is not yet available. */
export const MERCHANT_FALLBACKS = {
  merchantName: 'Bookglow merchant',
  outletName: 'Booking',
  /** Safe Bookglow default accent (matches --merchant-accent token). */
  accentColor: '#2f5d50',
} as const;
