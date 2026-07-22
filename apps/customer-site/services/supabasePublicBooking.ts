/**
 * Public booking reads/writes from Supabase (outlet, services, staff, slots, create).
 * Used only when VITE_DATA_PROVIDER=supabase.
 */
import type { BookglowSupabaseClient } from "@bookglow/supabase";
import { createBrowserSupabaseClient } from "@bookglow/supabase";
import type { PublicOutlet, PublicService, PublicTeamMember } from "./bookingApi";
import { shopNameToBookingSlug } from "../utils/bookingSlug";

type OutletRow = {
  outlet_id: string;
  name: string;
  address_display: string | null;
  phone_number: string | null;
  phone: string | null;
  timezone: string | null;
  business_hours: unknown;
  reviews: unknown;
  service_categories: unknown;
  booking_slug: string | null;
  is_active: boolean | null;
};

type ServiceRow = {
  id: string;
  name: string;
  price: number | null;
  duration: number | null;
  category: string | null;
  is_visible: boolean | null;
  is_promotion: boolean | null;
};

type StaffRow = {
  id: string;
  name: string;
  profile_picture: string | null;
  photo_url: string | null;
  qualified_services: unknown;
};

function viteEnv(): Record<string, string | undefined> {
  return import.meta.env as unknown as Record<string, string | undefined>;
}

function client(): BookglowSupabaseClient {
  return createBrowserSupabaseClient(viteEnv());
}

function mapOutlet(row: OutletRow): PublicOutlet {
  const businessHours =
    row.business_hours && typeof row.business_hours === "object"
      ? (row.business_hours as PublicOutlet["businessHours"])
      : {};
  const reviews = Array.isArray(row.reviews)
    ? (row.reviews as PublicOutlet["reviews"])
    : [];
  const serviceCategories = Array.isArray(row.service_categories)
    ? (row.service_categories as string[])
    : [];
  const bookingSlug =
    typeof row.booking_slug === "string" && row.booking_slug.trim() !== ""
      ? row.booking_slug.trim()
      : undefined;

  return {
    id: row.outlet_id,
    name: row.name || "Spa",
    addressDisplay: row.address_display || "",
    phoneNumber: row.phone_number || row.phone || "",
    businessHours,
    timezone: row.timezone || "Asia/Kuala_Lumpur",
    reviews,
    serviceCategories,
    bookingSlug,
  };
}

function mapService(row: ServiceRow): PublicService {
  return {
    id: row.id,
    name: row.name || "",
    price: Number(row.price ?? 0),
    duration: row.duration ?? 60,
    category: row.category || "",
    isPromotion: row.is_promotion === true,
  };
}

function mapStaff(row: StaffRow): PublicTeamMember {
  return {
    id: row.id,
    name: row.name || "",
    profilePicture: row.profile_picture || row.photo_url || "",
    qualifiedServices: Array.isArray(row.qualified_services)
      ? (row.qualified_services as string[])
      : undefined,
  };
}

/**
 * Same resolution order as Firestore bookingPathResolve.
 */
export async function resolveOutletIdFromBookingPathSupabase(
  segment: string
): Promise<string | null> {
  const s = (segment || "").trim();
  if (!s) return null;
  const sb = client();

  const byId = await sb
    .from("outlets")
    .select("outlet_id")
    .eq("outlet_id", s)
    .maybeSingle();
  if (byId.data?.outlet_id) return byId.data.outlet_id;

  const exact = await sb
    .from("outlets")
    .select("outlet_id")
    .eq("booking_slug", s)
    .limit(1)
    .maybeSingle();
  if (exact.data?.outlet_id) return exact.data.outlet_id;

  const lower = s.toLowerCase();
  const { data: rows, error } = await sb
    .from("outlets")
    .select("outlet_id, booking_slug, name")
    .eq("is_active", true);

  if (error) {
    console.error("Supabase outlet resolve failed:", error);
    return null;
  }

  for (const row of rows || []) {
    const stored = (row.booking_slug || "").trim();
    if (stored && stored.toLowerCase() === lower) return row.outlet_id;
    const derived = shopNameToBookingSlug(row.name || "");
    if (derived && derived.toLowerCase() === lower) return row.outlet_id;
  }

  return null;
}

export async function getPublicOutletFromSupabase(
  outletId: string
): Promise<PublicOutlet | null> {
  const sb = client();
  const { data, error } = await sb
    .from("outlets")
    .select(
      "outlet_id, name, address_display, phone_number, phone, timezone, business_hours, reviews, service_categories, booking_slug, is_active"
    )
    .eq("outlet_id", outletId)
    .maybeSingle();

  if (error) {
    console.error("Supabase outlet fetch failed:", error);
    return null;
  }
  if (!data) return null;
  return mapOutlet(data as OutletRow);
}

export async function listVisibleServicesFromSupabase(
  outletId: string
): Promise<PublicService[]> {
  const sb = client();
  const { data, error } = await sb
    .from("services")
    .select("id, name, price, duration, category, is_visible, is_promotion")
    .eq("outlet_id", outletId)
    .eq("is_visible", true);

  if (error) {
    console.error("Supabase services fetch failed:", error);
    return [];
  }

  return (data || [])
    .map((row) => mapService(row as ServiceRow))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export async function listStaffFromSupabase(
  outletId: string
): Promise<PublicTeamMember[]> {
  const sb = client();
  const { data, error } = await sb
    .from("staff")
    .select("id, name, profile_picture, photo_url, qualified_services")
    .eq("outlet_id", outletId);

  if (error) {
    console.error("Supabase staff fetch failed:", error);
    return [];
  }

  return (data || [])
    .map((row) => mapStaff(row as StaffRow))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export type GetAvailableSlotsInput = {
  outletId: string;
  serviceId: string;
  date: string;
  staffId?: string | null;
};

/**
 * Public available slots via SECURITY DEFINER RPC (no appointment rows exposed to anon).
 */
export async function getAvailableSlotsFromSupabase(
  input: GetAvailableSlotsInput
): Promise<string[]> {
  const sb = client();
  const staffId =
    input.staffId && input.staffId.trim().length > 0 ? input.staffId.trim() : null;
  const { data, error } = await sb.rpc("get_public_available_slots", {
    p_outlet_id: input.outletId,
    p_service_id: input.serviceId,
    p_date: input.date,
    p_staff_id: staffId,
  });

  if (error) {
    console.error("Supabase get_public_available_slots failed:", error);
    throw error;
  }

  return Array.isArray(data) ? (data as string[]) : [];
}

export type CreatePublicBookingInput = {
  outletId: string;
  serviceId: string;
  date: string;
  time: string;
  customerName: string;
  phone: string;
  email?: string;
  staffId?: string | null;
  /** Optional auth uid when customer auth is on Supabase */
  authUid?: string | null;
};

export type CreatePublicBookingResult = {
  success: boolean;
  appointmentId: string;
};

/**
 * Public booking create via SECURITY DEFINER RPC (no direct table writes from anon).
 */
export async function createPublicBookingFromSupabase(
  input: CreatePublicBookingInput
): Promise<CreatePublicBookingResult> {
  const sb = client();
  const staffId =
    input.staffId && input.staffId.trim().length > 0 ? input.staffId.trim() : null;
  const authUid =
    input.authUid && input.authUid.trim().length > 0 ? input.authUid.trim() : null;

  const { data, error } = await sb.rpc("create_public_booking", {
    p_outlet_id: input.outletId,
    p_service_id: input.serviceId,
    p_date: input.date,
    p_time: input.time,
    p_customer_name: input.customerName,
    p_phone: input.phone,
    p_email: input.email?.trim() ? input.email.trim() : null,
    p_staff_id: staffId,
    p_auth_uid: authUid,
  });

  if (error) {
    console.error("Supabase create_public_booking failed:", error);
    throw error;
  }

  const row = data as { success?: boolean; appointment_id?: string } | null;
  const appointmentId = row?.appointment_id;
  if (!appointmentId) {
    throw new Error("Booking succeeded but no appointment id was returned.");
  }

  return { success: row?.success !== false, appointmentId };
}

export type SubmitPublicReviewInput = {
  outletId: string;
  author?: string;
  text: string;
  rating: number;
};

/**
 * Authenticated review write via SECURITY DEFINER RPC (requires Supabase Auth session).
 */
export async function submitPublicReviewFromSupabase(
  input: SubmitPublicReviewInput
): Promise<{ success: boolean }> {
  const sb = client();
  const { data, error } = await sb.rpc("submit_public_review", {
    p_outlet_id: input.outletId,
    p_author: input.author?.trim() ? input.author.trim() : null,
    p_text: input.text,
    p_rating: input.rating,
  });

  if (error) {
    console.error("Supabase submit_public_review failed:", error);
    throw error;
  }

  const row = data as { success?: boolean } | null;
  return { success: row?.success !== false };
}

/** Upsert frontend_customers row for the signed-in Supabase user. */
export async function upsertFrontendCustomerProfileFromSupabase(input?: {
  email?: string | null;
  name?: string | null;
}): Promise<void> {
  const sb = client();
  const { error } = await sb.rpc("upsert_frontend_customer_profile", {
    p_email: input?.email?.trim() ? input.email.trim() : null,
    p_name: input?.name?.trim() ? input.name.trim() : null,
  });
  if (error) {
    console.error("Supabase upsert_frontend_customer_profile failed:", error);
    throw error;
  }
}

/** Current Supabase Auth user id, or null. */
export async function getSupabaseAuthUid(): Promise<string | null> {
  const sb = client();
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}
