import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DenseEntityRow } from './DenseEntityRow';
import { FilterToolbar } from './FilterToolbar';
import { PageHeader } from './PageHeader';
import { SectionHeader } from './SectionHeader';
import { StatusBadge } from './StatusBadge';

describe('shared mobile primitives', () => {
  it('supports page-header navigation and overflow actions without changing its heading', () => {
    render(
      <PageHeader
        leading={<button type="button">Back</button>}
        title="Members"
        description="Manage customer relationships."
        actions={<button type="button">Add</button>}
        overflowAction={<button type="button">More</button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Members' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument();
  });

  it('exposes filter chips and active-filter styling through one toolbar', () => {
    const { container } = render(
      <FilterToolbar
        active
        search={<input aria-label="Search members" />}
        filters={<button type="button">Filters</button>}
        chips={<button type="button">Active</button>}
      />,
    );

    expect(container.firstChild).toHaveClass('m-filter-toolbar--active');
    expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
  });

  it('renders section counts and accessible status labels', () => {
    render(
      <>
        <SectionHeader title="Upcoming" count={3} />
        <StatusBadge label="Appointment confirmed">Confirmed</StatusBadge>
      </>,
    );

    expect(screen.getByText('3')).toHaveClass('m-section-header-count');
    expect(screen.getByLabelText('Appointment confirmed')).toBeInTheDocument();
  });

  it('keeps disabled entity rows non-interactive', () => {
    const onClick = vi.fn();
    render(<DenseEntityRow title="Unavailable service" onClick={onClick} disabled />);

    const row = screen.getByRole('button', { name: 'Unavailable service' });
    expect(row).toBeDisabled();
    fireEvent.click(row);
    expect(onClick).not.toHaveBeenCalled();
  });
});
