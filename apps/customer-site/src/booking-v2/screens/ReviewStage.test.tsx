import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('../data/publicBookingAdapter', () => ({
  publicBookingAdapter: {
    loadMerchantSummary: vi.fn(),
    loadServiceCatalogue: vi.fn(),
    loadStaff: vi.fn(),
  },
}));

import { publicBookingAdapter } from '../data/publicBookingAdapter';
import { BookingProvider, useBooking } from '../state/BookingProvider';
import type { MerchantSummary } from '../state/bookingTypes';
import ReviewStage, { PREVIEW_CONFIRMATION_PREFIX } from './ReviewStage';

const mLoadMerchant = vi.mocked(publicBookingAdapter.loadMerchantSummary);

function merchant(): MerchantSummary {
  return {
    outletId: 'outlet_1',
    bookingPath: 'shop',
    merchantName: 'Bali Wellness',
    outletName: 'Bali Wellness',
    logoUrl: null,
    coverImageUrl: null,
    address: '1 Jalan Spa',
    phone: '0123 456',
    shortDescription: null,
    accentColor: null,
  };
}

/** Seeds a complete, review-ready booking. */
function Seed() {
  const { state, dispatch } = useBooking();
  React.useEffect(() => {
    if (!state.selectedService) {
      dispatch({
        type: 'SELECT_SERVICE',
        service: { id: 'svc-1', name: 'Deep Facial', price: 80, durationMinutes: 60, category: 'Face', currency: 'MYR' },
      });
      dispatch({ type: 'SET_PROFESSIONAL_PREFERENCE', preference: 'specific' });
      dispatch({ type: 'SELECT_PROFESSIONAL', professional: { id: 'p1', name: 'Susi', photoUrl: null } });
      dispatch({ type: 'SELECT_DATE', date: '2026-07-20' });
      dispatch({ type: 'SELECT_TIME_SLOT', slot: { time: '10:00', label: '10:00 AM' } });
      dispatch({
        type: 'UPDATE_CUSTOMER_DETAILS',
        details: { fullName: 'Jane Doe', phone: '0123456789', email: 'jane@example.com' },
      });
      dispatch({ type: 'SET_BOOKING_NOTES', notes: 'Window seat' });
    }
  }, [dispatch, state.selectedService]);
  return null;
}

/** Probe for the confirmation created by the preview action. */
function ConfirmationProbe() {
  const { state } = useBooking();
  return <div data-testid="conf" data-ref={state.confirmation?.appointmentId ?? ''} />;
}

function LocationDisplay() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function renderStage() {
  return render(
    <MemoryRouter initialEntries={['/book-v2/shop/review']}>
      <Routes>
        <Route
          path="/book-v2/:bookingPath/*"
          element={
            <BookingProvider bookingPath="shop">
              <Seed />
              <ReviewStage />
              <ConfirmationProbe />
            </BookingProvider>
          }
        />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  vi.clearAllMocks();
  mLoadMerchant.mockResolvedValue({ status: 'ok', merchant: merchant() });
});

afterEach(() => cleanup());

describe('ReviewStage — final summary', () => {
  it('shows merchant, service, professional, date, time, price and customer details', async () => {
    renderStage();
    expect(await screen.findByText('Deep Facial')).toBeTruthy();
    expect(screen.getByText('Bali Wellness')).toBeTruthy();
    expect(screen.getByText(/1 h · RM 80/)).toBeTruthy();
    expect(screen.getByText('Susi')).toBeTruthy();
    expect(screen.getByText('Mon, 20 Jul 2026')).toBeTruthy();
    expect(screen.getByText('10:00 AM')).toBeTruthy();
    expect(screen.getByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText(/0123456789 · jane@example.com/)).toBeTruthy();
    expect(screen.getByText(/Window seat/)).toBeTruthy();
    // Total row.
    expect(screen.getByText('Total')).toBeTruthy();
  });

  it('offers Edit actions that navigate back to each stage', async () => {
    renderStage();
    await screen.findByText('Deep Facial');
    fireEvent.click(screen.getByRole('button', { name: 'Edit date and time' }));
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/book-v2/shop/date-time'));
  });

  it('preview confirmation creates a marked preview reference and opens confirmation', async () => {
    renderStage();
    await screen.findByText('Deep Facial');
    const confirm = screen
      .getAllByRole('button', { name: /Confirm booking \(preview\)/i })
      .find((b) => !(b as HTMLButtonElement).disabled);
    expect(confirm).toBeTruthy();
    fireEvent.click(confirm!);
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/book-v2/shop/confirmation'));
    const ref = screen.getByTestId('conf').getAttribute('data-ref') ?? '';
    expect(ref.startsWith(PREVIEW_CONFIRMATION_PREFIX)).toBe(true);
  });

  it('clearly states no real booking is made', async () => {
    renderStage();
    await screen.findByText('Deep Facial');
    expect(screen.getByText(/no real booking is made/i)).toBeTruthy();
  });
});
