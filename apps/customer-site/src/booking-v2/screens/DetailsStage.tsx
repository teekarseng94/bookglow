/**
 * DetailsStage — final mobile-first customer details form.
 *
 * Name, phone, optional email and booking notes, bound to the typed booking
 * store. Inline validation shows accessible errors (aria-invalid +
 * aria-describedby + role=alert) after a field has been touched. Continue is
 * enabled only when the details satisfy the shared completeness selector.
 */
import React, { useId, useState } from 'react';
import { useBooking } from '../state/BookingProvider';
import { hasValidDetails } from '../state/bookingSelectors';
import { MAX_BOOKING_NOTES_LENGTH } from '../state/bookingPersistence';
import {
  validateEmailField,
  validateFullNameField,
  validatePhoneField,
} from './detailsValidation';
import { StageActions } from './StageActions';

type FieldKey = 'fullName' | 'phone' | 'email';

export default function DetailsStage() {
  const { state, dispatch } = useBooking();
  const { customerDetails } = state;
  const idBase = useId();

  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    fullName: false,
    phone: false,
    email: false,
  });

  const errors: Record<FieldKey, string | null> = {
    fullName: validateFullNameField(customerDetails.fullName),
    phone: validatePhoneField(customerDetails.phone),
    email: validateEmailField(customerDetails.email),
  };

  const update = (field: FieldKey, value: string) =>
    dispatch({ type: 'UPDATE_CUSTOMER_DETAILS', details: { [field]: value } });

  const touch = (field: FieldKey) => setTouched((t) => ({ ...t, [field]: true }));

  const field = (
    key: FieldKey,
    label: string,
    type: string,
    autoComplete: string,
    optional = false,
  ) => {
    const showError = touched[key] && errors[key] !== null;
    const inputId = `${idBase}-${key}`;
    const errorId = `${inputId}-error`;
    return (
      <div className="bgv2-field">
        <label className="bgv2-field-label" htmlFor={inputId}>
          {label}
          {optional && <span className="bgv2-field-optional"> (optional)</span>}
        </label>
        <input
          id={inputId}
          className="bgv2-input"
          type={type}
          value={customerDetails[key]}
          autoComplete={autoComplete}
          aria-invalid={showError || undefined}
          aria-describedby={showError ? errorId : undefined}
          onChange={(e) => update(key, e.target.value)}
          onBlur={() => touch(key)}
        />
        {showError && (
          <p id={errorId} className="bgv2-field-error" role="alert">
            {errors[key]}
          </p>
        )}
      </div>
    );
  };

  const notesId = `${idBase}-notes`;

  return (
    <section className="bgv2-content" aria-labelledby="bgv2-details-heading">
      <div className="bgv2-surface bgv2-discovery">
        <h1 id="bgv2-details-heading" className="bgv2-section-title">
          Your details
        </h1>
        <p className="bgv2-supporting" style={{ marginBottom: 'var(--space-5)' }}>
          We'll use these to confirm your booking.
        </p>

        <form className="bgv2-form" onSubmit={(e) => e.preventDefault()} noValidate>
          {field('fullName', 'Full name', 'text', 'name')}
          {field('phone', 'Phone', 'tel', 'tel')}
          {field('email', 'Email', 'email', 'email', true)}

          <div className="bgv2-field">
            <label className="bgv2-field-label" htmlFor={notesId}>
              Booking notes<span className="bgv2-field-optional"> (optional)</span>
            </label>
            <textarea
              id={notesId}
              className="bgv2-input bgv2-textarea"
              rows={3}
              maxLength={MAX_BOOKING_NOTES_LENGTH}
              value={state.bookingNotes}
              placeholder="Anything the team should know?"
              onChange={(e) => dispatch({ type: 'SET_BOOKING_NOTES', notes: e.target.value })}
            />
          </div>
        </form>
      </div>

      <p className="bgv2-visually-hidden" aria-live="polite">
        {hasValidDetails(state)
          ? 'Details look complete.'
          : 'Enter your name and phone number to continue.'}
      </p>

      <StageActions stage="details" canContinue={hasValidDetails(state)} />
    </section>
  );
}
