/**
 * BookingV2Routes — parallel V2 booking routing.
 *
 * Mounted at /book-v2/:bookingPath/* from the app entry. Wraps the journey in
 * the typed BookingProvider, renders the shell layout, and nests the guarded
 * stage screens. Uses the project's existing router (react-router-dom); no new
 * router is introduced.
 */
import React, { useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { BookingProvider } from '../state/BookingProvider';
import { BookingV2Layout } from '../layouts/BookingV2Layout';
import { BookingErrorBoundary } from '../components/BookingErrorBoundary';
import { BookingRouteGuard } from './BookingRouteGuard';
import { DEFAULT_STAGE_PATH } from './bookingRouteConfig';
import ServiceStage from '../screens/ServiceStage';
import ProfessionalStage from '../screens/ProfessionalStage';
import DateTimeStage from '../screens/DateTimeStage';
import DetailsStage from '../screens/DetailsStage';
import ReviewStage from '../screens/ReviewStage';
import ConfirmationStage from '../screens/ConfirmationStage';

export default function BookingV2Routes() {
  const { bookingPath } = useParams<{ bookingPath: string }>();

  // The parent route (/book-v2/:bookingPath/*) always provides bookingPath.
  const path = bookingPath ?? '';

  // Bumped by the top-level error boundary's retry to force a fresh provider
  // instance (and thus a clean re-init) after an unexpected error.
  const [resetNonce, setResetNonce] = useState(0);

  return (
    // Top-level boundary wraps the ENTIRE V2 tree: provider init, session
    // restore, merchant load, accent processing, layout and stage rendering are
    // all protected. The live /book route is unaffected (separate subtree).
    <BookingErrorBoundary onReset={() => setResetNonce((n) => n + 1)}>
      {/* Keying the provider on the booking path guarantees a different
          merchant path mounts a FRESH provider — Merchant A's selections can
          never render under Merchant B's URL. The nonce lets retry remount. */}
      <BookingProvider key={`${path}::${resetNonce}`} bookingPath={path}>
        <Routes>
          <Route element={<BookingV2Layout />}>
          <Route index element={<Navigate to={DEFAULT_STAGE_PATH} replace />} />
          <Route
            path="service"
            element={
              <BookingRouteGuard stage="service">
                <ServiceStage />
              </BookingRouteGuard>
            }
          />
          <Route
            path="professional"
            element={
              <BookingRouteGuard stage="professional">
                <ProfessionalStage />
              </BookingRouteGuard>
            }
          />
          <Route
            path="date-time"
            element={
              <BookingRouteGuard stage="date-time">
                <DateTimeStage />
              </BookingRouteGuard>
            }
          />
          <Route
            path="details"
            element={
              <BookingRouteGuard stage="details">
                <DetailsStage />
              </BookingRouteGuard>
            }
          />
          <Route
            path="review"
            element={
              <BookingRouteGuard stage="review">
                <ReviewStage />
              </BookingRouteGuard>
            }
          />
          <Route
            path="confirmation"
            element={
              <BookingRouteGuard stage="confirmation">
                <ConfirmationStage />
              </BookingRouteGuard>
            }
          />
          <Route path="*" element={<Navigate to={DEFAULT_STAGE_PATH} replace />} />
          </Route>
        </Routes>
      </BookingProvider>
    </BookingErrorBoundary>
  );
}
