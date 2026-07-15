/**
 * ReviewStage — final booking summary before submission.
 *
 * Shows merchant, service, professional preference, date, time, price and
 * customer details, each with an Edit action back to its stage (navigation
 * only — unrelated selections are untouched). The production booking API is
 * NOT called: in development a clearly-marked preview confirmation can be
 * generated (client state only, never a Firestore write) so the confirmation
 * design is reviewable end-to-end.
 */
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBooking } from '../state/BookingProvider';
import { isStageAccessible } from '../state/bookingSelectors';
import type { BookingStage } from '../state/bookingTypes';
import { stageToPath } from '../routes/bookingRouteConfig';
import { formatDuration, formatPrice } from '../data/serviceCatalogue';
import { formatLongDate } from '../utils/dates';
import { MERCHANT_FALLBACKS } from '../data/publicBookingTypes';
import { StageActions } from './StageActions';

/** Preview confirmations are client-only and carry this reference prefix. */
export const PREVIEW_CONFIRMATION_PREFIX = 'preview-';

export default function ReviewStage() {
  const { state, dispatch } = useBooking();
  const navigate = useNavigate();
  const { bookingPath } = useParams<{ bookingPath: string }>();

  const goToStage = (stage: BookingStage) =>
    navigate(`/book-v2/${bookingPath}/${stageToPath(stage)}`);

  const service = state.selectedService;
  const merchantName = state.merchant?.merchantName ?? MERCHANT_FALLBACKS.merchantName;
  const professionalLabel =
    state.professionalPreference === 'any'
      ? 'Any available professional'
      : state.selectedProfessional?.name ?? '—';

  const reviewReady = isStageAccessible('review', state);
  const devPreviewEnabled = import.meta.env.DEV;

  const confirmPreview = () => {
    if (!service || !state.selectedDate || !state.selectedTimeSlot) return;
    dispatch({ type: 'BEGIN_SUBMISSION' });
    dispatch({
      type: 'SUBMISSION_SUCCEEDED',
      confirmation: {
        appointmentId: `${PREVIEW_CONFIRMATION_PREFIX}${Date.now().toString(36).toUpperCase()}`,
        serviceName: service.name,
        date: state.selectedDate,
        time: state.selectedTimeSlot.label ?? state.selectedTimeSlot.time,
        professionalName:
          state.professionalPreference === 'any'
            ? null
            : state.selectedProfessional?.name ?? null,
      },
    });
    navigate(`/book-v2/${bookingPath}/confirmation`);
  };

  const rows: Array<{
    label: string;
    value: React.ReactNode;
    editStage: BookingStage;
    editLabel: string;
  }> = [
    {
      label: 'Service',
      value: service ? (
        <>
          <span className="bgv2-review-primary">{service.name}</span>
          <span className="bgv2-review-secondary">
            {formatDuration(service.durationMinutes)} · {formatPrice(service.price, service.currency)}
          </span>
        </>
      ) : (
        '—'
      ),
      editStage: 'service',
      editLabel: 'Edit service',
    },
    {
      label: 'Professional',
      value: <span className="bgv2-review-primary">{professionalLabel}</span>,
      editStage: 'professional',
      editLabel: 'Edit professional',
    },
    {
      label: 'Date & time',
      value:
        state.selectedDate && state.selectedTimeSlot ? (
          <>
            <span className="bgv2-review-primary">{formatLongDate(state.selectedDate)}</span>
            <span className="bgv2-review-secondary">
              {state.selectedTimeSlot.label ?? state.selectedTimeSlot.time}
            </span>
          </>
        ) : (
          '—'
        ),
      editStage: 'date-time',
      editLabel: 'Edit date and time',
    },
    {
      label: 'Your details',
      value: (
        <>
          <span className="bgv2-review-primary">{state.customerDetails.fullName || '—'}</span>
          <span className="bgv2-review-secondary">
            {state.customerDetails.phone}
            {state.customerDetails.email ? ` · ${state.customerDetails.email}` : ''}
          </span>
          {state.bookingNotes && (
            <span className="bgv2-review-secondary">“{state.bookingNotes}”</span>
          )}
        </>
      ),
      editStage: 'details',
      editLabel: 'Edit your details',
    },
  ];

  return (
    <section className="bgv2-content" aria-labelledby="bgv2-review-heading">
      <div className="bgv2-surface bgv2-discovery">
        <h1 id="bgv2-review-heading" className="bgv2-section-title">
          Review your booking
        </h1>
        <p className="bgv2-supporting" style={{ marginBottom: 'var(--space-5)' }}>
          Booking with <strong>{merchantName}</strong>
        </p>

        <dl className="bgv2-review-list">
          {rows.map((row) => (
            <div key={row.label} className="bgv2-review-row">
              <dt className="bgv2-review-label">{row.label}</dt>
              <dd className="bgv2-review-value">{row.value}</dd>
              <button
                type="button"
                className="bgv2-review-edit"
                aria-label={row.editLabel}
                onClick={() => goToStage(row.editStage)}
              >
                Edit
              </button>
            </div>
          ))}
        </dl>

        {service && (
          <p className="bgv2-review-total">
            <span>Total</span>
            <strong>{formatPrice(service.price, service.currency)}</strong>
          </p>
        )}

        <p className="bgv2-supporting" style={{ marginTop: 'var(--space-4)' }}>
          {devPreviewEnabled
            ? 'Design preview: confirming creates a preview confirmation only — no real booking is made.'
            : 'Booking submission will be enabled in a later phase.'}
        </p>
      </div>

      <StageActions
        stage="review"
        canContinue={reviewReady && devPreviewEnabled}
        onContinue={confirmPreview}
        continueLabel="Confirm booking (preview)"
      />
    </section>
  );
}
