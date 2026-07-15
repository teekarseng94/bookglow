/**
 * V2 public booking adapter.
 *
 * Maps the public outlet document + services collection into the V2 domain
 * types the storefront needs. Fields that do not yet exist in the data model
 * (logo, cover image, public accent colour, short description) are returned as
 * typed `null` — never invented — and the UI applies governed fallbacks.
 *
 * This is the data boundary: screens import the adapter, never Firestore.
 */
import type { MerchantSummary } from '../state/bookingTypes';
import {
  resolveOutletId,
  fetchOutletProfile,
  fetchServices,
  fetchStaff,
  type OutletProfileDoc,
} from './publicBookingApi';
import {
  DEFAULT_CURRENCY,
  type LoadMerchantResult,
  type LoadServicesResult,
  type LoadStaffResult,
} from './publicBookingTypes';
import { buildCategories, buildServiceCatalogue } from './serviceCatalogue';
import { buildStaffList } from './staffCatalogue';

function toMerchantSummary(
  bookingPath: string,
  outletId: string,
  profile: OutletProfileDoc,
): MerchantSummary {
  return {
    outletId,
    bookingPath,
    merchantName: profile.name ?? null,
    outletName: profile.name ?? null,
    logoUrl: profile.logoUrl ?? null,
    coverImageUrl: profile.coverImageUrl ?? null,
    address: profile.addressDisplay ?? null,
    phone: profile.phoneNumber ?? null,
    shortDescription: profile.shortDescription ?? profile.description ?? null,
    accentColor: profile.accentColor ?? null,
  };
}

export const publicBookingAdapter = {
  /**
   * Resolve a booking path and load the public merchant summary for the shell.
   * Returns a discriminated result so the shell can render not-found / disabled
   * / error states without throwing.
   */
  async loadMerchantSummary(bookingPath: string): Promise<LoadMerchantResult> {
    const path = (bookingPath || '').trim();
    if (!path) return { status: 'not-found' };

    let outletId: string | null;
    try {
      outletId = await resolveOutletId(path);
    } catch (err) {
      return { status: 'error', message: reportError('loadMerchantSummary.resolve', err) };
    }
    if (!outletId) return { status: 'not-found' };

    let profile: OutletProfileDoc | null;
    try {
      profile = await fetchOutletProfile(outletId);
    } catch (err) {
      return { status: 'error', message: reportError('loadMerchantSummary.profile', err) };
    }
    if (!profile) return { status: 'not-found' };

    const merchant = toMerchantSummary(path, outletId, profile);

    // Explicitly disabled public booking -> governed "disabled" state, but keep
    // the merchant so the shell can still show contact details.
    if (profile.bookingEnabled === false || profile.isActive === false) {
      return { status: 'disabled', merchant };
    }

    return { status: 'ok', merchant };
  },

  /**
   * Load the public service catalogue for an outlet: valid, active, publicly
   * bookable services plus their categories. Reads the outlet doc once for the
   * currency and merchant category order.
   */
  async loadServiceCatalogue(outletId: string): Promise<LoadServicesResult> {
    const id = (outletId || '').trim();
    if (!id) return { status: 'error', message: 'Missing outlet.' };

    try {
      const [profile, raws] = await Promise.all([
        fetchOutletProfile(id).catch(() => null),
        fetchServices(id),
      ]);
      const currency = profile?.currency ?? DEFAULT_CURRENCY;
      const categoryOrder = Array.isArray(profile?.serviceCategories)
        ? (profile?.serviceCategories as string[]).filter((c) => typeof c === 'string')
        : [];

      const services = buildServiceCatalogue(raws, currency, categoryOrder);
      const categories = buildCategories(services, categoryOrder);
      return { status: 'ok', services, categories };
    } catch (err) {
      return { status: 'error', message: reportError('loadServiceCatalogue', err) };
    }
  },

  /**
   * Load the outlet's public staff (id/name/role/photo/qualifiedServices only).
   * Qualification filtering by service is applied in the screen so the loaded
   * list can be reused as selections change.
   */
  async loadStaff(outletId: string): Promise<LoadStaffResult> {
    const id = (outletId || '').trim();
    if (!id) return { status: 'error', message: GENERIC_LOAD_ERROR };

    try {
      const raws = await fetchStaff(id);
      return { status: 'ok', staff: buildStaffList(raws) };
    } catch (err) {
      return { status: 'error', message: reportError('loadStaff', err) };
    }
  },
};

/**
 * Log the technical error for developers and return a governed, generic message
 * safe to show customers. Raw Firebase/Firestore messages are NEVER surfaced.
 */
function reportError(context: string, err: unknown): string {
  console.error(`[booking-v2] ${context}`, err);
  return GENERIC_LOAD_ERROR;
}

export const GENERIC_LOAD_ERROR = 'Something went wrong. Please try again.';
