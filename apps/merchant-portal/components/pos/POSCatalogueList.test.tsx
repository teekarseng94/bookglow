import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  POSCatalogueEmptyState,
  resolvePOSEmptyKind,
} from './POSCatalogueList';

describe('POS empty states', () => {
  it('uses one no-catalog empty state when the catalogue has no items', () => {
    expect(
      resolvePOSEmptyKind({
        activeCatalog: 'all',
        filteredServices: 0,
        filteredProducts: 0,
        filteredPackages: 0,
        hasSearch: false,
        category: 'All',
      }),
    ).toBe('no-catalog');
  });

  it('uses a no-results empty state when search or category filters match nothing', () => {
    expect(
      resolvePOSEmptyKind({
        activeCatalog: 'all',
        filteredServices: 0,
        filteredProducts: 0,
        filteredPackages: 0,
        hasSearch: true,
        category: 'All',
      }),
    ).toBe('no-results');
  });

  it('renders a single actionable empty state without a duplicate fallback message', () => {
    const onGoToMenu = vi.fn();
    render(
      <POSCatalogueEmptyState kind="no-catalog" onClearFilters={() => undefined} onGoToMenu={onGoToMenu} />,
    );
    expect(screen.getByRole('heading', { name: 'No services yet' })).toBeInTheDocument();
    expect(screen.queryByText(/no items found/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no services found/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to Menu' }));
    expect(onGoToMenu).toHaveBeenCalled();
  });
});
