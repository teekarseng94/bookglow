/**
 * ServiceStage (Phase 1) — real merchant storefront + service selection.
 *
 * Loads the public service catalogue through the data adapter (no Firestore in
 * screens), lets the customer filter/search and select exactly ONE service,
 * then continue to the professional stage. All temporary dev fixtures are gone.
 */
import React, { useMemo, useState } from 'react';
import { useBooking } from '../state/BookingProvider';
import { hasService } from '../state/bookingSelectors';
import type { PublicService } from '../state/bookingTypes';
import {
  ALL_CATEGORY_ID,
  filterServices,
} from '../data/serviceCatalogue';
import { useServiceCatalogue } from './useServiceCatalogue';
import { MerchantStorefrontHeader } from '../components/storefront/MerchantStorefrontHeader';
import { ServiceFilters } from '../components/services/ServiceFilters';
import { ServiceSearch } from '../components/services/ServiceSearch';
import { ServiceList } from '../components/services/ServiceList';
import { ServiceEmptyState } from '../components/services/ServiceEmptyState';
import { ServiceSkeleton } from '../components/services/ServiceSkeleton';
import { StageActions } from './StageActions';

/** Show search only when there are enough services for it to be useful. */
const SEARCH_THRESHOLD = 6;

export default function ServiceStage() {
  const { state, dispatch } = useBooking();
  const merchant = state.merchant;
  const catalogue = useServiceCatalogue(state.outletId);

  const [categoryId, setCategoryId] = useState<string>(ALL_CATEGORY_ID);
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => filterServices(catalogue.services, { categoryId, query }),
    [catalogue.services, categoryId, query],
  );

  const selectedId = state.selectedService?.id ?? null;

  const handleSelect = (service: PublicService) => {
    // Store only the public snapshot fields later stages need.
    dispatch({
      type: 'SELECT_SERVICE',
      service: {
        id: service.id,
        name: service.name,
        price: service.price,
        durationMinutes: service.durationMinutes,
        category: service.categoryName,
        currency: service.currency,
      },
    });
  };

  const resetFilters = () => {
    setCategoryId(ALL_CATEGORY_ID);
    setQuery('');
  };

  const showSearch = catalogue.services.length >= SEARCH_THRESHOLD;
  const selectedName = state.selectedService?.name ?? null;

  const renderDiscovery = () => {
    if (catalogue.status === 'loading') {
      return <ServiceSkeleton />;
    }

    if (catalogue.status === 'error') {
      return (
        <div className="bgv2-empty" role="alert">
          <p className="bgv2-empty-title">Couldn't load services</p>
          <p className="bgv2-supporting">Please try again in a moment.</p>
          <button type="button" className="bgv2-btn bgv2-btn--primary" onClick={catalogue.retry}>
            Retry
          </button>
        </div>
      );
    }

    if (catalogue.services.length === 0) {
      return (
        <ServiceEmptyState
          variant="no-services"
          phone={merchant?.phone ?? null}
          address={merchant?.address ?? null}
        />
      );
    }

    return (
      <>
        {showSearch && (
          <ServiceSearch value={query} onChange={setQuery} resultCount={filtered.length} />
        )}
        <ServiceFilters
          categories={catalogue.categories}
          activeCategoryId={categoryId}
          onSelect={setCategoryId}
        />
        <p className="bgv2-service-count" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'service' : 'services'}
        </p>

        {filtered.length === 0 ? (
          <ServiceEmptyState variant="no-results" onResetFilters={resetFilters} />
        ) : (
          <ServiceList services={filtered} selectedId={selectedId} onSelect={handleSelect} />
        )}
      </>
    );
  };

  return (
    <section className="bgv2-content" aria-labelledby="bgv2-storefront-heading">
      <h2 id="bgv2-storefront-heading" className="bgv2-visually-hidden">
        Merchant storefront and services
      </h2>

      {merchant && <MerchantStorefrontHeader merchant={merchant} />}

      <div className="bgv2-surface bgv2-discovery">
        <h2 className="bgv2-section-title">Choose a service</h2>
        {renderDiscovery()}
      </div>

      {/* Screen-reader announcement of the current selection. */}
      <p className="bgv2-visually-hidden" aria-live="polite">
        {selectedName ? `Selected service: ${selectedName}` : 'No service selected'}
      </p>

      <StageActions stage="service" canContinue={hasService(state)} />
    </section>
  );
}
