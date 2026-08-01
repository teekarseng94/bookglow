import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InventoryToolbar } from './inventory/InventoryToolbar';
import { ReportFilterToolbar } from './reports/ReportFilterToolbar';
import { ReportTxnCard } from './reports/ReportTxnCard';
import { SettingsSection } from './settings/SettingsSection';
import { StaffCard } from './staff/StaffCard';

describe('Step 4 mobile patterns', () => {
  it('keeps inventory search visible with square filter and sort controls', () => {
    render(
      <InventoryToolbar
        categories={['Hair']}
        selectedCategory="All"
        onCategoryChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        sortBy="a-z"
        onSortChange={vi.fn()}
        onOpenFiltersSheet={vi.fn()}
        onOpenSortSheet={vi.fn()}
      />,
    );

    expect(screen.getByRole('searchbox', { name: 'Search services...' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter inventory' })).toHaveClass('m-icon-btn--md');
    expect(screen.getByRole('button', { name: 'Sort inventory' })).toHaveClass('m-icon-btn--md');
  });

  it('uses the same compact report filter control', () => {
    render(
      <ReportFilterToolbar
        searchValue=""
        onSearchChange={vi.fn()}
        onOpenFilters={vi.fn()}
        chips={<button type="button">All</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Filters' })).toHaveClass('m-icon-btn--md');
    expect(screen.getByText('All').parentElement).toHaveClass('m-filter-chips');
  });

  it('shares interactive entity-card structure across staff and transactions', () => {
    const { rerender } = render(<StaffCard name="Aisha" role="Stylist" onSelect={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveClass('m-card', 'm-entity-row', 'm-card-interactive');

    rerender(
      <ReportTxnCard
        amountLabel="RM 80.00"
        customer="Nadia"
        dateTimeLabel="1 Aug, 10:00"
        paymentMethod="Cash"
        statusLabel="Paid"
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByRole('button')).toHaveClass('m-card', 'm-entity-row', 'm-card-interactive');
  });

  it('uses the shared card boundary for settings accordions', () => {
    const { container } = render(<SettingsSection title="Operating Hours">Hours</SettingsSection>);
    expect(container.querySelector('section')).toHaveClass('m-card');
    expect(screen.getByRole('button', { name: /Operating Hours/i })).toHaveAttribute('aria-expanded', 'false');
  });
});
