/**
 * V2 booking route configuration.
 *
 * One declarative table drives the routes, the progress indicator, page titles
 * and the guards — so route logic is not scattered across a giant component.
 */
import type { BookingStage } from '../state/bookingTypes';

export interface BookingRouteDef {
  stage: BookingStage;
  /** Path segment under /book-v2/:bookingPath/ */
  path: string;
  /** Short label for the progress indicator. */
  label: string;
  /** Document title suffix for this stage. */
  title: string;
}

export const BOOKING_ROUTES: readonly BookingRouteDef[] = [
  { stage: 'service', path: 'service', label: 'Service', title: 'Choose a service' },
  { stage: 'professional', path: 'professional', label: 'Professional', title: 'Choose a professional' },
  { stage: 'date-time', path: 'date-time', label: 'Date & time', title: 'Pick a date & time' },
  { stage: 'details', path: 'details', label: 'Details', title: 'Your details' },
  { stage: 'review', path: 'review', label: 'Review', title: 'Review booking' },
  { stage: 'confirmation', path: 'confirmation', label: 'Confirmation', title: 'Booking confirmed' },
];

/** Default landing sub-route for /book-v2/:bookingPath. */
export const DEFAULT_STAGE_PATH = 'service';

export function stageToPath(stage: BookingStage): string {
  return BOOKING_ROUTES.find((r) => r.stage === stage)?.path ?? DEFAULT_STAGE_PATH;
}

export function pathToStage(path: string): BookingStage | null {
  return BOOKING_ROUTES.find((r) => r.path === path)?.stage ?? null;
}
