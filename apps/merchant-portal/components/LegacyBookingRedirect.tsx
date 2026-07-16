import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

const CUSTOMER_BOOKING_ORIGIN = 'https://bookglow-83fb3.web.app';

/**
 * Legacy merchant-host booking URL → customer-site booking.
 * No Firestore reads. No booking logic.
 */
const LegacyBookingRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    const segment = (id || '').trim();
    if (!segment) return;
    const query = typeof window !== 'undefined' ? window.location.search : '';
    const target = `${CUSTOMER_BOOKING_ORIGIN}/book/${encodeURIComponent(segment)}${query}`;
    window.location.replace(target);
  }, [id]);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[var(--bg-soft,#f8fafc)] px-4"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-[var(--text-secondary,#475569)]">
        Redirecting to booking page…
      </p>
    </div>
  );
};

export default LegacyBookingRedirect;
