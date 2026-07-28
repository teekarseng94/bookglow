import { resolveOutletIdFromBookingPathSupabase } from "./supabasePublicBooking";

/**
 * Map /book/:segment to the real outlet document id.
 *
 * Resolution order:
 * 1. Document id (legacy `/book/outlet_001`)
 * 2. Exact `bookingSlug` / `booking_slug`
 * 3. Case-insensitive slug match
 * 4. Slug derived from outlet name
 */
export async function resolveOutletIdFromBookingPath(segment: string): Promise<string | null> {
  return resolveOutletIdFromBookingPathSupabase(segment);
}
