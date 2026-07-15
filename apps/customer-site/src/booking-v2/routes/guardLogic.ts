/**
 * Pure route-guard logic (no React) so it can be unit tested directly.
 *
 * Given the stage a URL is trying to reach and the current booking state,
 * return the stage the customer should be redirected to, or null when the
 * target stage is allowed.
 */
import type { BookingStage, BookingV2State } from '../state/bookingTypes';
import { earliestIncompleteStage, isStageAccessible } from '../state/bookingSelectors';

export function resolveStageRedirect(
  targetStage: BookingStage,
  state: BookingV2State,
): BookingStage | null {
  if (isStageAccessible(targetStage, state)) {
    return null;
  }
  const destination = earliestIncompleteStage(state);
  // Never redirect a stage to itself (avoids redirect loops).
  return destination === targetStage ? null : destination;
}
