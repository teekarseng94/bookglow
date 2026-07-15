/**
 * Lightweight Suspense fallback for the lazily-loaded V2 booking chunk.
 *
 * Intentionally minimal: an accessible status message inside the V2 shell
 * scope — no full-screen overlay over the rest of the app.
 */
import React from 'react';

export default function BookingV2RouteFallback() {
  return (
    <div className="bg-v2">
      <div className="bgv2-state" role="status" aria-live="polite">
        <div className="bgv2-spinner" aria-hidden="true" />
        <p className="bgv2-supporting">Loading booking…</p>
      </div>
    </div>
  );
}
