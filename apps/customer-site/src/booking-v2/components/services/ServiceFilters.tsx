/**
 * ServiceFilters — category chips (including "All services").
 *
 * Only categories that actually contain services are shown. The active chip is
 * marked with aria-current and styled with the merchant accent.
 */
import React from 'react';
import type { ServiceCategory } from '../../data/publicBookingTypes';
import { ALL_CATEGORY_ID } from '../../data/serviceCatalogue';

interface Props {
  categories: ServiceCategory[];
  activeCategoryId: string;
  onSelect: (categoryId: string) => void;
}

export function ServiceFilters({ categories, activeCategoryId, onSelect }: Props) {
  if (categories.length === 0) return null;

  const chip = (id: string, label: string) => {
    const active = activeCategoryId === id;
    return (
      <button
        key={id}
        type="button"
        className={`bgv2-category-chip${active ? ' is-active' : ''}`}
        aria-current={active ? 'true' : undefined}
        onClick={() => onSelect(id)}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="bgv2-category-filters" role="group" aria-label="Filter services by category">
      {chip(ALL_CATEGORY_ID, 'All services')}
      {categories.map((c) => chip(c.id, c.name))}
    </div>
  );
}
