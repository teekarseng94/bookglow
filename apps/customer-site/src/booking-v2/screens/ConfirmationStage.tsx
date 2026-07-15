/**
 * ConfirmationStage — the complete final confirmation design.
 *
 * Reachable only with a successful confirmation in state (guarded). Shows the
 * booking reference, service, date, time, professional, merchant address (map
 * link) and phone (tel link). Preview confirmations (created from the review
 * stage in development) carry a visible "design preview" badge — no Firestore
 * appointment is ever created here.
 */
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBooking } from '../state/BookingProvider';
import { formatLongDate } from '../utils/dates';
import { MERCHANT_FALLBACKS } from '../data/publicBookingTypes';
import { PREVIEW_CONFIRMATION_PREFIX } from './ReviewStage';

export default function ConfirmationStage() {
  const { state, dispatch } = useBooking();
  const navigate = useNavigate();
  const { bookingPath } = useParams<{ bookingPath: string }>();

  const c = state.confirmation;
  const merchant = state.merchant;
  const merchantName = merchant?.merchantName ?? MERCHANT_FALLBACKS.merchantName;

  if (!c) {
    // Guard normally prevents this; render nothing rather than crash.
    return null;
  }

  const isPreview = c.appointmentId.startsWith(PREVIEW_CONFIRMATION_PREFIX);

  const bookAnother = () => {
    dispatch({ type: 'RESET_BOOKING' });
    navigate(`/book-v2/${bookingPath}/service`);
  };

  const detailRows: Array<[string, string]> = [
    ['Service', c.serviceName],
    ['Date', formatLongDate(c.date)],
    ['Time', c.time],
    ['Professional', c.professionalName ?? 'Any available professional'],
  ];

  return (
    <section className="bgv2-content" aria-labelledby="bgv2-confirm-heading">
      <div className="bgv2-surface bgv2-confirm">
        <div className="bgv2-confirm-hero">
          <span className="bgv2-confirm-check" aria-hidden="true">
            ✓
          </span>
          <h1 id="bgv2-confirm-heading">Booking confirmed</h1>
          <p className="bgv2-supporting">
            You're booked with <strong>{merchantName}</strong>.
          </p>
          {isPreview && (
            <p className="bgv2-preview-badge" role="note">
              Design preview — no real booking was created
            </p>
          )}
          <p className="bgv2-confirm-ref">
            <span className="bgv2-eyebrow">Booking reference</span>
            <strong>{c.appointmentId}</strong>
          </p>
        </div>

        <dl className="bgv2-confirm-details">
          {detailRows.map(([label, value]) => (
            <div key={label} className="bgv2-confirm-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {(merchant?.address || merchant?.phone) && (
          <div className="bgv2-confirm-contact">
            <h2 className="bgv2-eyebrow">Getting there</h2>
            {merchant?.address && (
              <a
                className="bgv2-contact-link"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(merchant.address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span aria-hidden="true">📍</span>
                <span>{merchant.address}</span>
              </a>
            )}
            {merchant?.phone && (
              <a
                className="bgv2-contact-link"
                href={`tel:${merchant.phone.replace(/\s+/g, '')}`}
              >
                <span aria-hidden="true">📞</span>
                <span>{merchant.phone}</span>
              </a>
            )}
          </div>
        )}
      </div>

      <p className="bgv2-visually-hidden" aria-live="polite">
        Booking confirmed. Reference {c.appointmentId}.
      </p>

      {/* Desktop inline + mobile sticky closing action. */}
      <div className="bgv2-stage-actions">
        <span />
        <button type="button" className="bgv2-btn bgv2-btn--primary" onClick={bookAnother}>
          Book another service
        </button>
      </div>
      <div className="bgv2-mobile-actions" role="group" aria-label="Booking complete">
        <button type="button" className="bgv2-btn bgv2-btn--primary" onClick={bookAnother}>
          Book another service
        </button>
      </div>
    </section>
  );
}
