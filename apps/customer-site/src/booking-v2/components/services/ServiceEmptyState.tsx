/**
 * ServiceEmptyState — differentiates "merchant has no services" from
 * "no services match the current filter/search", offering a reset for the
 * latter. Contact details are shown when the whole catalogue is empty.
 */
import React from 'react';

interface Props {
  variant: 'no-services' | 'no-results';
  onResetFilters?: () => void;
  phone?: string | null;
  address?: string | null;
}

export function ServiceEmptyState({ variant, onResetFilters, phone, address }: Props) {
  if (variant === 'no-results') {
    return (
      <div className="bgv2-empty" role="status">
        <p className="bgv2-empty-title">No services match your search</p>
        <p className="bgv2-supporting">Try a different category or search term.</p>
        {onResetFilters && (
          <button type="button" className="bgv2-btn bgv2-btn--ghost" onClick={onResetFilters}>
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bgv2-empty" role="status">
      <p className="bgv2-empty-title">No services available</p>
      <p className="bgv2-supporting">
        No services are currently available for online booking.
      </p>
      {(phone || address) && (
        <p className="bgv2-supporting">
          {phone && (
            <>
              Call <a className="bgv2-contact-inline" href={`tel:${phone.replace(/\s+/g, '')}`}>{phone}</a>
              {address ? ' · ' : ''}
            </>
          )}
          {address}
        </p>
      )}
    </div>
  );
}
