/**
 * ServiceList — a radiogroup of ServiceCards (one selectable service).
 */
import React from 'react';
import type { PublicService } from '../../state/bookingTypes';
import { ServiceCard } from './ServiceCard';

interface Props {
  services: PublicService[];
  selectedId: string | null;
  onSelect: (service: PublicService) => void;
}

export function ServiceList({ services, selectedId, onSelect }: Props) {
  return (
    <div className="bgv2-service-list" role="radiogroup" aria-label="Available services">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          selected={service.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
