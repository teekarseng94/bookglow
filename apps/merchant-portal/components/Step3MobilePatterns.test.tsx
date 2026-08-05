import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UpcomingAppointments } from './dashboard/UpcomingAppointments';
import { MemberToolbar } from './members/MemberToolbar';
import { POSCatalogueToolbar } from './pos/POSCatalogueToolbar';
import { ScheduleBookingCard } from './schedule/ScheduleBookingCard';

describe('Step 3 mobile patterns', () => {
  it('uses the shared section grammar for dashboard appointments', () => {
    render(
      <UpcomingAppointments
        rows={[{
          id: 'booking-1',
          timeLabel: '10:00',
          title: 'Haircut',
          customerName: 'Aisha',
          statusLabel: 'scheduled',
        }]}
      />,
    );

    expect(screen.getByRole('heading', { name: "Today's Appointments" })).toBeInTheDocument();
    expect(screen.getByText('1')).toHaveClass('m-section-header-count');
  });

  it('keeps member search visible with one square mobile actions control', () => {
    render(
      <MemberToolbar
        search=""
        onSearchChange={vi.fn()}
        onAddMember={vi.fn()}
        onOpenFilters={vi.fn()}
      />,
    );

    expect(screen.getByRole('searchbox', { name: 'Search members' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Member actions and filters' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add member' })).not.toBeInTheDocument();
  });

  it('marks POS filters active without changing catalogue callbacks', async () => {
    const { container } = render(
      <POSCatalogueToolbar
        search=""
        onSearchChange={vi.fn()}
        activeCatalog="services"
        onCatalogChange={vi.fn()}
        sortBy="a-z"
        onSortChange={vi.fn()}
        categories={['All']}
        selectedCategory="All"
        onCategoryChange={vi.fn()}
      />,
    );

    expect(container.firstChild).toHaveClass('m-filter-toolbar--active');
    const filterButtons = screen.getAllByRole('button', { name: 'Catalogue filters and sort' });
    filterButtons[0].click();
    expect(screen.getAllByRole('button', { name: 'Services' }).length).toBeGreaterThan(0);
  });

  it('uses the shared appointment-card grammar in Schedule', () => {
    render(
      <ScheduleBookingCard
        timeLabel="10:00"
        customerName="Aisha"
        serviceName="Haircut"
        staffName="Mei"
        status="scheduled"
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole('button')).toHaveClass('m-appointment-row', 'm-card-interactive');
    expect(screen.getByText('scheduled')).toHaveClass('m-status-badge');
  });
});
