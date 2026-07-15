/**
 * Thin V2 wrapper over the existing customer-site public booking data sources.
 *
 * This is the only place in booking-v2 that talks to Firestore / the legacy
 * services. It exposes narrow, typed calls; publicBookingAdapter maps their raw
 * output to V2 domain types. Screens never import Firestore.
 *
 * Merchant identity for the shell is read from the public `outlets/{id}`
 * document (the same source the live booking page uses for name/address/phone),
 * rather than the services Cloud Function — so the shell does not depend on the
 * heavier getPublicOutletData call.
 */
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { resolveOutletIdFromBookingPath } from '../../../services/bookingPathResolve';
import { getPublicOutletData, type PublicOutletData } from '../../../services/bookingApi';

export type { PublicOutletData };

/**
 * Public fields we read off the outlet document for the V2 shell. Optional
 * fields (logo/cover/accent/description) may not exist yet in the data model;
 * they are read defensively so the adapter surfaces real values automatically
 * once the backend adds them. `serviceCategories` provides the merchant's
 * preferred category order.
 */
export interface OutletProfileDoc {
  name?: string;
  addressDisplay?: string;
  phoneNumber?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  accentColor?: string;
  shortDescription?: string;
  description?: string;
  serviceCategories?: string[];
  currency?: string;
  /** Optional explicit flag to disable public booking. */
  bookingEnabled?: boolean;
  isActive?: boolean;
}

/**
 * Raw service document shape (from the `services` collection). Mirrors the
 * merchant portal `Service` model; only the customer-relevant fields are typed
 * here. All are optional because we validate defensively in the adapter.
 */
export interface RawServiceDoc {
  id: string;
  name?: unknown;
  price?: unknown;
  duration?: unknown;
  category?: unknown;
  categoryId?: unknown;
  description?: unknown;
  imageUrl?: unknown;
  isVisible?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
}

/**
 * Raw staff document shape (from the `staff` collection). Only customer-safe
 * fields are typed; email/phone/internal fields are intentionally NOT read into
 * the public layer.
 */
export interface RawStaffDoc {
  id: string;
  name?: unknown;
  role?: unknown;
  profilePicture?: unknown;
  photoURL?: unknown;
  qualifiedServices?: unknown;
}

export async function resolveOutletId(bookingPath: string): Promise<string | null> {
  return resolveOutletIdFromBookingPath(bookingPath);
}

/** Read the public outlet document. Returns null when it does not exist. */
export async function fetchOutletProfile(outletId: string): Promise<OutletProfileDoc | null> {
  const snap = await getDoc(doc(db, 'outlets', outletId));
  if (!snap.exists()) return null;
  return snap.data() as OutletProfileDoc;
}

/**
 * Read the outlet's services. Filtered by `outletID` only (a single-field
 * equality filter that needs no composite index); ordering is applied by the
 * adapter client-side. Returns raw docs for the adapter to validate/map.
 */
export async function fetchServices(outletId: string): Promise<RawServiceDoc[]> {
  const servicesRef = collection(db, 'services');
  const servicesQuery = query(servicesRef, where('outletID', '==', outletId));
  const snap = await getDocs(servicesQuery);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
}

/**
 * Read the outlet's staff. Filtered by `outletID` only (single-field equality,
 * no composite index). Returns raw docs; the adapter selects only public fields
 * and never surfaces email/phone/internal data.
 */
export async function fetchStaff(outletId: string): Promise<RawStaffDoc[]> {
  const staffRef = collection(db, 'staff');
  const staffQuery = query(staffRef, where('outletID', '==', outletId));
  const snap = await getDocs(staffQuery);
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    // Only forward customer-safe fields — deliberately drop email/phone/etc.
    return {
      id: d.id,
      name: data.name,
      role: data.role,
      profilePicture: data.profilePicture,
      photoURL: data.photoURL,
      qualifiedServices: data.qualifiedServices,
    };
  });
}

/** Kept for later phases (team loading); not used by the storefront. */
export async function fetchPublicOutletData(outletId: string): Promise<PublicOutletData> {
  return getPublicOutletData(outletId);
}
