import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { FilterChip, FilterChipRow } from './FilterChipRow';
import { MetricRail } from './MetricRail';
import { MobilePageActions } from './MobilePageActions';
import { PageHeader } from './PageHeader';

describe('BookGlow UX System V5 primitives', () => {
  it('defaults PageHeader to app-owned so the shell can own the phone title', () => {
    const { container } = render(<PageHeader title="Staff & Team" description="Manage your team." />);
    expect(container.firstChild).toHaveClass('m-page-header--app-owned');
    expect(screen.getByRole('heading', { name: 'Staff & Team' })).toBeInTheDocument();
  });

  it('allows a local title when appOwned is false', () => {
    const { container } = render(<PageHeader appOwned={false} title="Local title" />);
    expect(container.firstChild).not.toHaveClass('m-page-header--app-owned');
  });

  it('keeps page actions content-width instead of flex-1 heroes', () => {
    const { container } = render(
      <MobilePageActions
        hideOnDesktop={false}
        primary={<Button size="sm">Add Staff</Button>}
        secondary={<Button variant="secondary" size="sm">Roles</Button>}
      />,
    );

    expect(container.firstChild).toHaveClass('m-page-actions');
    expect(container.querySelector('.flex-1')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Staff' })).not.toHaveClass('w-full');
    expect(screen.getByRole('button', { name: 'Roles' })).not.toHaveClass('w-full');
  });

  it('opens overflow actions in a sheet', () => {
    const onRoles = vi.fn();
    render(
      <MobilePageActions
        hideOnDesktop={false}
        primary={<Button size="sm">Add Staff</Button>}
        overflowItems={[{ id: 'roles', label: 'Roles', onClick: onRoles }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Roles' }));
    expect(onRoles).toHaveBeenCalledOnce();
  });

  it('renders a compact two-column metric grid', () => {
    const { container } = render(
      <MetricRail
        items={[
          { id: 'total', label: 'Total Staff', value: '8' },
          { id: 'active', label: 'Active Today', value: '4' },
        ]}
      />,
    );

    expect(container.firstChild).toHaveClass('m-metric-rail--grid');
    expect(screen.getByText('Total Staff')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('keeps filter chips in one toolbar row with pressed state', () => {
    const { container } = render(
      <FilterChipRow ariaLabel="Role filter">
        <FilterChip selected>All</FilterChip>
        <FilterChip>Lead Therapist</FilterChip>
      </FilterChipRow>,
    );

    expect(container.firstChild).toHaveClass('m-filter-chip-row');
    expect(screen.getByRole('toolbar', { name: 'Role filter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });
});
