/**
 * ServiceCard — a single selectable service.
 *
 * Rendered as a `role="radio"` button (one service per booking). Selection is
 * conveyed with text + icon in addition to colour, has a visible focus state,
 * and meets the minimum touch-target size. The whole card is the control.
 */
import React from 'react';
import type { PublicService } from '../../state/bookingTypes';
import { formatDuration, formatPrice } from '../../data/serviceCatalogue';

interface Props {
  service: PublicService;
  selected: boolean;
  onSelect: (service: PublicService) => void;
}

export function ServiceCard({ service, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`bgv2-service-card${selected ? ' is-selected' : ''}`}
      onClick={() => onSelect(service)}
    >
      {service.imageUrl && (
        <span className="bgv2-service-card-media">
          <img src={service.imageUrl} alt="" loading="lazy" width={96} height={96} />
        </span>
      )}

      <span className="bgv2-service-card-body">
        <span className="bgv2-service-card-head">
          <span className="bgv2-service-card-name">{service.name}</span>
          {selected && (
            <span className="bgv2-service-selected" aria-hidden="true">
              ✓ Selected
            </span>
          )}
        </span>

        {service.description && (
          <span className="bgv2-service-card-desc">{service.description}</span>
        )}

        <span className="bgv2-service-card-meta">
          {service.categoryName && (
            <span className="bgv2-service-chip">{service.categoryName}</span>
          )}
          <span className="bgv2-service-duration">{formatDuration(service.durationMinutes)}</span>
          <span className="bgv2-service-price">{formatPrice(service.price, service.currency)}</span>
        </span>
      </span>
    </button>
  );
}
