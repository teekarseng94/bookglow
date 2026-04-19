/**
 * Public booking API (no auth). Calls Cloud Functions for outlet data and creating bookings.
 * Used by the Booking Portal at /book/:bookingPath (outlet id or booking slug).
 * createPublicBooking sends outletId; the Cloud Function writes outletID to the appointment document for backend filtering.
 */
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export interface PublicOutlet {
  id: string;
  name: string;
  addressDisplay?: string;
  phoneNumber?: string;
  businessHours?: Record<string, { open: string; close: string; isOpen?: boolean }>;
  timezone?: string;
  reviews?: { author?: string; text?: string; rating?: number }[];
  /** Optional: menu/booking category order synced from backend Menu page */
  serviceCategories?: string[];
  /** Pretty URL segment for /book/:slug when set (Firestore id stays on `id`). */
  bookingSlug?: string;
}

export interface PublicService {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: string;
  /** Optional: show in Promotion filter when true */
  isPromotion?: boolean;
}

export interface PublicTeamMember {
  id: string;
  name: string;
  /** Staff photo URL (same as Staff & Team page profile picture) */
  profilePicture?: string;
  /** Qualified service IDs; if omitted/empty, treated as qualified for all services. */
  qualifiedServices?: string[];
}

export interface PublicOutletData {
  outlet: PublicOutlet;
  services: PublicService[];
  team?: PublicTeamMember[];
}

export interface CreateBookingPayload {
  outletId: string; // Sent to Cloud Function; stored as outletID in Firestore for backend useFirestoreData filter
  serviceId: string;
  date: string;
  time: string;
  customerName: string;
  phone: string;
  email?: string;
  staffId?: string; // Optional: specific team member for this booking
}

export interface CreateBookingResult {
  success: boolean;
  appointmentId: string;
}

export interface GetAvailableSlotsPayload {
  outletId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  staffId?: string; // Optional: filter slots by specific team member availability
}

export interface GetAvailableSlotsResult {
  slots: string[];
}

export async function getPublicOutletData(outletId: string): Promise<PublicOutletData> {
  const fn = httpsCallable<{ outletId: string }, PublicOutletData>(functions, "getPublicOutletData");
  const res = await fn({ outletId });
  return res.data;
}

export async function createPublicBooking(payload: CreateBookingPayload): Promise<CreateBookingResult> {
  const fn = httpsCallable<CreateBookingPayload, CreateBookingResult>(functions, "createPublicBooking");
  const res = await fn(payload);
  return res.data;
}

export async function getAvailableSlots(payload: GetAvailableSlotsPayload): Promise<GetAvailableSlotsResult> {
  const fn = httpsCallable<GetAvailableSlotsPayload, GetAvailableSlotsResult>(functions, "getPublicAvailableSlots");
  const res = await fn(payload);
  return res.data;
}
