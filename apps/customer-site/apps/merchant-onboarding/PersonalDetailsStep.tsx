import React, { useId } from 'react';
import {
  CALLING_CODES,
  DEFAULT_CALLING_CODE,
  DEFAULT_COUNTRY_NAME,
  formatNationalDisplay,
  phoneValidationMessage,
} from './personalDetails';
import type { MerchantOnboardingPayload } from './onboardingTypes';

interface Props {
  payload: MerchantOnboardingPayload;
  onChange: (patch: Partial<MerchantOnboardingPayload>) => void;
  submitted: boolean;
  privacyPolicyHref: string;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
}

export default function PersonalDetailsStep({
  payload,
  onChange,
  submitted,
  privacyPolicyHref,
  titleRef,
}: Props) {
  const firstId = useId();
  const lastId = useId();
  const phoneId = useId();
  const countryId = useId();
  const consentId = useId();
  const firstError = payload.firstName.trim() ? null : 'Enter your first name.';
  const phoneError = phoneValidationMessage(payload.phoneNational);
  const consentError = payload.legalAccepted ? null : 'Please agree to the Privacy Policy to continue.';
  const showFirst = submitted && firstError;
  const showPhone = submitted && phoneError;
  const showConsent = submitted && consentError;

  return (
    <div className="merchant-onboarding__personal">
      <div className="merchant-onboarding__personal-hero">
        <h1 tabIndex={-1} ref={titleRef} id="personal-details-title">Finish signing up</h1>
        <p className="merchant-onboarding__description">We need a couple more details from you</p>
      </div>

      <div className="merchant-onboarding__field">
        <label htmlFor={firstId}>First name</label>
        <input
          id={firstId}
          name="given-name"
          autoComplete="given-name"
          value={payload.firstName}
          onChange={(event) => onChange({ firstName: event.target.value })}
          aria-invalid={showFirst ? true : undefined}
          aria-describedby={showFirst ? `${firstId}-error` : undefined}
        />
        {showFirst ? <p id={`${firstId}-error`} className="merchant-onboarding__field-error" role="alert">{firstError}</p> : null}
      </div>

      <div className="merchant-onboarding__field">
        <label htmlFor={lastId}>Last name <span>(Optional)</span></label>
        <input
          id={lastId}
          name="family-name"
          autoComplete="family-name"
          value={payload.lastName}
          onChange={(event) => onChange({ lastName: event.target.value })}
        />
      </div>

      <div className="merchant-onboarding__field">
        <label htmlFor={phoneId}>Mobile number</label>
        <div className="merchant-onboarding__phone-row">
          <select
            aria-label="Country calling code, Malaysia +60"
            value={DEFAULT_CALLING_CODE}
            disabled
          >
            {CALLING_CODES.map((item) => (
              <option key={item.iso} value={item.callingCode}>{item.callingCode}</option>
            ))}
          </select>
          <input
            id={phoneId}
            name="tel"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="12 382 9709"
            value={payload.phoneNational}
            onChange={(event) => onChange({ phoneNational: event.target.value })}
            onBlur={() => {
              if (payload.phoneNational.trim()) {
                onChange({ phoneNational: formatNationalDisplay(payload.phoneNational) });
              }
            }}
            aria-invalid={showPhone ? true : undefined}
            aria-describedby={showPhone ? `${phoneId}-error` : undefined}
          />
        </div>
        {showPhone ? <p id={`${phoneId}-error`} className="merchant-onboarding__field-error" role="alert">{phoneError}</p> : null}
      </div>

      <div className="merchant-onboarding__field">
        <label htmlFor={countryId}>Country</label>
        <div className="merchant-onboarding__country-row">
          <input id={countryId} name="country" autoComplete="country-name" value={DEFAULT_COUNTRY_NAME} readOnly />
          <button
            type="button"
            className="merchant-onboarding__country-edit"
            disabled
            aria-disabled="true"
            aria-label="Country cannot be changed. BookGlow currently supports Malaysia only."
          >
            Edit
          </button>
        </div>
      </div>

      <div className="merchant-onboarding__consent">
        <input
          id={consentId}
          name="legal"
          type="checkbox"
          checked={payload.legalAccepted}
          onChange={(event) => onChange({ legalAccepted: event.target.checked })}
          aria-invalid={showConsent ? true : undefined}
          aria-describedby={showConsent ? `${consentId}-error` : undefined}
        />
        <label htmlFor={consentId}>
          I agree to the{' '}
          <a href={privacyPolicyHref} target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </label>
      </div>
      {showConsent ? <p id={`${consentId}-error`} className="merchant-onboarding__field-error" role="alert">{consentError}</p> : null}
    </div>
  );
}
