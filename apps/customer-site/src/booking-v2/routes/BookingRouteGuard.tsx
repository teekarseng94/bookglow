/**
 * BookingRouteGuard — prevents deep-linking past incomplete stages.
 *
 * Wraps each stage screen. If the target stage's prerequisites are missing, it
 * redirects to the earliest incomplete stage (computed centrally). Otherwise it
 * renders the screen and syncs currentStage to the URL. Redirects use `replace`
 * so the browser Back button stays usable, and never target the same stage
 * (loop-safe).
 */
import React, { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import type { BookingStage } from '../state/bookingTypes';
import { useBooking } from '../state/BookingProvider';
import { resolveStageRedirect } from './guardLogic';
import { stageToPath } from './bookingRouteConfig';

interface BookingRouteGuardProps {
  stage: BookingStage;
  children: React.ReactNode;
}

export function BookingRouteGuard({ stage, children }: BookingRouteGuardProps) {
  const { bookingPath } = useParams<{ bookingPath: string }>();
  const { state, dispatch } = useBooking();

  const redirectStage = resolveStageRedirect(stage, state);

  // Keep the store's currentStage aligned with the URL for allowed stages.
  useEffect(() => {
    if (!redirectStage && state.currentStage !== stage) {
      dispatch({ type: 'GO_TO_STAGE', stage });
    }
  }, [redirectStage, stage, state.currentStage, dispatch]);

  if (redirectStage) {
    return (
      <Navigate
        to={`/book-v2/${bookingPath}/${stageToPath(redirectStage)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}
