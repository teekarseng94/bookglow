/**
 * ProfessionalStage (Phase 2) — real staff selection.
 *
 * Loads the outlet's public staff through the data adapter (no Firestore in
 * screens), filters by the selected service's qualification, and lets the
 * customer choose "Any available professional" (recommended) OR exactly one
 * specific professional. Changing the preference/professional clears date & time
 * via the reducer. All temporary dev fixtures are gone.
 */
import React, { useMemo } from 'react';
import { useBooking } from '../state/BookingProvider';
import { hasProfessionalPreference } from '../state/bookingSelectors';
import type { PublicStaff } from '../data/publicBookingTypes';
import { filterQualifiedStaff } from '../data/staffCatalogue';
import { useStaff } from './useStaff';
import { MerchantStorefrontHeader } from '../components/storefront/MerchantStorefrontHeader';
import { ProfessionalList } from '../components/professionals/ProfessionalList';
import { ProfessionalSkeleton } from '../components/professionals/ProfessionalSkeleton';
import { StageActions } from './StageActions';

export default function ProfessionalStage() {
  const { state, dispatch } = useBooking();
  const merchant = state.merchant;
  const staff = useStaff(state.outletId);

  const serviceId = state.selectedService?.id ?? null;
  const qualified = useMemo(
    () => filterQualifiedStaff(staff.staff, serviceId),
    [staff.staff, serviceId],
  );

  const preference = state.professionalPreference;
  const selectedStaffId = state.selectedProfessional?.id ?? null;

  const selectAny = () => dispatch({ type: 'SET_PROFESSIONAL_PREFERENCE', preference: 'any' });

  const selectStaff = (member: PublicStaff) => {
    dispatch({ type: 'SET_PROFESSIONAL_PREFERENCE', preference: 'specific' });
    dispatch({
      type: 'SELECT_PROFESSIONAL',
      professional: { id: member.id, name: member.name, photoUrl: member.photoUrl },
    });
  };

  const liveMessage =
    preference === 'any'
      ? 'Any available professional selected.'
      : state.selectedProfessional
        ? `Selected professional: ${state.selectedProfessional.name}`
        : 'No professional selected yet.';

  const renderDiscovery = () => {
    if (staff.status === 'loading') {
      return <ProfessionalSkeleton />;
    }

    if (staff.status === 'error') {
      return (
        <div className="bgv2-empty" role="alert">
          <p className="bgv2-empty-title">Couldn't load professionals</p>
          <p className="bgv2-supporting">Please try again in a moment.</p>
          <button type="button" className="bgv2-btn bgv2-btn--primary" onClick={staff.retry}>
            Retry
          </button>
        </div>
      );
    }

    // Zero qualified staff (including zero staff records at all) — do not
    // offer "Any available professional"; show a governed unavailable state
    // with the merchant's contact details instead.
    if (qualified.length === 0) {
      return (
        <div className="bgv2-empty" role="status">
          <p className="bgv2-empty-title">No professionals available</p>
          <p className="bgv2-supporting">
            Online booking for this service isn't available right now. Please
            contact the merchant directly.
          </p>
          {(merchant?.phone || merchant?.address) && (
            <p className="bgv2-supporting">
              {merchant?.phone && (
                <a
                  className="bgv2-contact-inline"
                  href={`tel:${merchant.phone.replace(/\s+/g, '')}`}
                >
                  {merchant.phone}
                </a>
              )}
              {merchant?.phone && merchant?.address ? ' · ' : ''}
              {merchant?.address}
            </p>
          )}
        </div>
      );
    }

    return (
      <ProfessionalList
        staff={qualified}
        preference={preference}
        selectedStaffId={selectedStaffId}
        onSelectAny={selectAny}
        onSelectStaff={selectStaff}
      />
    );
  };

  return (
    <section className="bgv2-content" aria-labelledby="bgv2-professional-heading">
      <h2 id="bgv2-professional-heading" className="bgv2-visually-hidden">
        Choose a professional
      </h2>

      {merchant && <MerchantStorefrontHeader merchant={merchant} />}

      <div className="bgv2-surface bgv2-discovery">
        <h2 className="bgv2-section-title">Choose a professional</h2>
        {renderDiscovery()}
      </div>

      <p className="bgv2-visually-hidden" aria-live="polite">
        {liveMessage}
      </p>

      {/* Continue requires a preference AND at least one qualified professional. */}
      <StageActions
        stage="professional"
        canContinue={hasProfessionalPreference(state) && qualified.length > 0}
      />
    </section>
  );
}
