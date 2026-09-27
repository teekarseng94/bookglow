import { outletService } from '../services/databaseService';
import { uniqueBookingSlug } from './bookingSlug';

/**
 * Guarantee a public booking path is stored on the outlet.
 * New shops often have an empty booking_slug (CJK names, save wiping the path, or
 * onboarding slug never loaded). The Settings URL then falls back to a 39-character
 * outlet id that truncates on phone and fails /book/:segment lookup.
 */
export async function ensureOutletBookingSlug(input: {
  outletId: string;
  existing?: string | null;
  name?: string | null;
}): Promise<string> {
  const outletId = (input.outletId || '').trim();
  const stored = (input.existing || '').trim();
  if (stored) return stored;
  if (!outletId) return '';

  let slug = uniqueBookingSlug(input.name || '', outletId);
  try {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const taken = await outletService.getByBookingSlug(slug);
      if (!taken || taken.outletID === outletId) {
        await outletService.update(outletId, { bookingSlug: slug });
        return slug;
      }
      slug = uniqueBookingSlug(input.name || 'business', `${outletId}${attempt + 1}`);
    }
    await outletService.update(outletId, { bookingSlug: slug });
  } catch (persistErr) {
    console.warn('Could not auto-persist bookingSlug:', persistErr);
  }
  return slug;
}
