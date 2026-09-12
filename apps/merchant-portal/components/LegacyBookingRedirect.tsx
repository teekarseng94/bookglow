import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { customerSiteOrigin } from '../utils/customerSiteUrl';

const CUSTOMER_BOOKING_ORIGIN = customerSiteOrigin();

/**
 * Legacy merchant-host booking URL → customer-site booking.
 * No Firestore reads. No booking logic.
 */
const LegacyBookingRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    const segment = (id || '').trim();
    if (!segment || !CUSTOMER_BOOKING_ORIGIN) return;
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
        {CUSTOMER_BOOKING_ORIGIN
          ? 'Redirecting to booking page…'
          : 'Booking origin is not configured. Set VITE_CUSTOMER_SITE_URL and rebuild the merchant portal.'}
      </p>
    </div>
  );
};

export default LegacyBookingRedirect;
