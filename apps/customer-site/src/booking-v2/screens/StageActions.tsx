/**
 * StageActions — the shared Previous/Continue action bar for V2 stages.
 *
 * Renders a desktop inline bar and a mobile sticky bar (visibility handled by
 * CSS). Continue is disabled until `canContinue`. Shared by every stage screen.
 */
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { BookingStage } from '../state/bookingTypes';
import { BOOKING_STAGE_ORDER } from '../state/bookingTypes';
import { stageToPath } from '../routes/bookingRouteConfig';

interface StageActionsProps {
  stage: BookingStage;
  canContinue?: boolean;
  onContinue?: () => void;
  continueLabel?: string;
}

function neighbours(stage: BookingStage): { prev: BookingStage | null; next: BookingStage | null } {
  const i = BOOKING_STAGE_ORDER.indexOf(stage);
  return {
    prev: i > 0 ? BOOKING_STAGE_ORDER[i - 1] : null,
    next: i >= 0 && i < BOOKING_STAGE_ORDER.length - 1 ? BOOKING_STAGE_ORDER[i + 1] : null,
  };
}

export function StageActions({
  stage,
  canContinue = true,
  onContinue,
  continueLabel = 'Continue',
}: StageActionsProps) {
  const navigate = useNavigate();
  const { bookingPath } = useParams<{ bookingPath: string }>();
  const { prev, next } = neighbours(stage);

  const goTo = (target: BookingStage) => navigate(`/book-v2/${bookingPath}/${stageToPath(target)}`);

  const handleContinue = () => {
    if (onContinue) return onContinue();
    if (next) goTo(next);
  };

  const continueDisabled = !canContinue || !next;

  const buttons = (
    <>
      <button
        type="button"
        className="bgv2-btn bgv2-btn--ghost"
        onClick={() => prev && goTo(prev)}
        disabled={!prev}
      >
        Previous
      </button>
      {next && (
        <button
          type="button"
          className="bgv2-btn bgv2-btn--primary"
          onClick={handleContinue}
          disabled={continueDisabled}
        >
          {continueLabel}
        </button>
      )}
    </>
  );

  return (
    <>
      <div className="bgv2-stage-actions">{buttons}</div>
      <div className="bgv2-mobile-actions" role="group" aria-label="Booking navigation">
        {buttons}
      </div>
    </>
  );
}
