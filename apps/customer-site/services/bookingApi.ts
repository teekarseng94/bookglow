/**
 * Shared public booking TypeScript types.
 * Live reads/writes use supabasePublicBooking (Supabase RPC + tables).
 */

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
  /** Pretty URL segment for /book/:slug when set (outlet id stays on `id`). */
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
  outletId: string;
  serviceId: string;
  date: string;
  time: string;
  customerName: string;
  phone: string;
  email?: string;
  staffId?: string;
}

export interface CreateBookingResult {
  success: boolean;
  appointmentId: string;
}

export interface GetAvailableSlotsPayload {
  outletId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  staffId?: string;
}

export interface GetAvailableSlotsResult {
  slots: string[];
}

export interface SubmitPublicReviewPayload {
  outletId: string;
  author: string;
  text: string;
  rating: number;
}

export interface SubmitPublicReviewResult {
  success: boolean;
}

const LEGACY_MSG = "Firebase Cloud Functions removed. Use Supabase public booking helpers.";

export async function getPublicOutletData(_outletId: string): Promise<PublicOutletData> {
  throw new Error(LEGACY_MSG);
}

export async function createPublicBooking(_payload: CreateBookingPayload): Promise<CreateBookingResult> {
  throw new Error(LEGACY_MSG);
}

export async function getAvailableSlots(_payload: GetAvailableSlotsPayload): Promise<GetAvailableSlotsResult> {
  throw new Error(LEGACY_MSG);
}

export async function submitPublicReview(_payload: SubmitPublicReviewPayload): Promise<SubmitPublicReviewResult> {
  throw new Error(LEGACY_MSG);
}
