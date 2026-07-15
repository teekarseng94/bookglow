/**
 * V2 availability boundary.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ TEMPORARY SAMPLE DATA — NON-PRODUCTION.                             │
 * │ The real availability API (Cloud Function `getPublicAvailableSlots`)│
 * │ is connected in a later phase. Until then this adapter generates    │
 * │ deterministic, typed sample slots so the full journey can be        │
 * │ visually reviewed. Results carry `isSample: true` and the UI shows  │
 * │ a visible preview note. Nothing here writes to Firestore.           │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Screens depend only on this adapter's types, so swapping in the real
 * API later is a data-layer change with no UI rewrite.
 */
import { parseLocalISO, formatSlotLabel } from '../utils/dates';

export interface TimeSlotOption {
  /** "HH:mm" 24h start time. */
  time: string;
  /** Display label, e.g. "10:30 AM". */
  label: string;
  /** False when the slot exists but cannot be booked. */
  available: boolean;
}

export interface AvailabilityParams {
  outletId: string;
  serviceId: string;
  /** YYYY-MM-DD */
  date: string;
  /** Specific professional, or null for "any". */
  staffId: string | null;
}

export type LoadDaySlotsResult =
  | { status: 'ok'; slots: TimeSlotOption[]; closed: boolean; isSample: boolean }
  | { status: 'error'; message: string };

/** Deterministic string hash so sample data is stable across reloads. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const OPEN_MINUTES = 10 * 60; // 10:00
const CLOSE_MINUTES = 18 * 60; // slots end before 18:00
const STEP_MINUTES = 30;

/**
 * SAMPLE adapter — see the banner above. Deterministic per
 * (date, time, serviceId, staffId): the same inputs always produce the same
 * schedule. Sundays render as closed so the "closed day" state is reviewable.
 */
export const availabilityAdapter = {
  async loadDaySlots(params: AvailabilityParams): Promise<LoadDaySlotsResult> {
    // Small latency so loading states are visible during design review.
    await new Promise((resolve) => setTimeout(resolve, 150));

    const day = parseLocalISO(params.date).getDay();
    if (day === 0) {
      // Sample rule: closed on Sundays.
      return { status: 'ok', slots: [], closed: true, isSample: true };
    }

    const slots: TimeSlotOption[] = [];
    for (let minutes = OPEN_MINUTES; minutes < CLOSE_MINUTES; minutes += STEP_MINUTES) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const seed = hashString(
        `${params.date}:${time}:${params.serviceId}:${params.staffId ?? 'any'}`,
      );
      slots.push({
        time,
        label: formatSlotLabel(time),
        // ~70% of sample slots are available.
        available: seed % 10 >= 3,
      });
    }
    return { status: 'ok', slots, closed: false, isSample: true };
  },
};
