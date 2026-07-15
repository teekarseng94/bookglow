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
import ConfirmationStage from './ConfirmationStage';

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

/** Seeds a completed booking with a preview confirmation (once only). */
function Seed() {
  const { dispatch } = useBooking();
  const seeded = React.useRef(false);
  React.useEffect(() => {
    if (!seeded.current) {
      seeded.current = true;
      dispatch({
        type: 'SELECT_SERVICE',
        service: { id: 'svc-1', name: 'Deep Facial', price: 80, durationMinutes: 60, category: 'Face', currency: 'MYR' },
      });
      dispatch({ type: 'BEGIN_SUBMISSION' });
      dispatch({
        type: 'SUBMISSION_SUCCEEDED',
        confirmation: {
          appointmentId: 'preview-ABC123',
          serviceName: 'Deep Facial',
          date: '2026-07-20',
          time: '10:00 AM',
          professionalName: 'Susi',
        },
      });
    }
  }, [dispatch]);
  return null;
}

function StateProbe() {
  const { state } = useBooking();
  return <div data-testid="svc" data-svc={state.selectedService?.id ?? ''} />;
}

function LocationDisplay() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function renderStage() {
  return render(
    <MemoryRouter initialEntries={['/book-v2/shop/confirmation']}>
      <Routes>
        <Route
          path="/book-v2/:bookingPath/*"
          element={
            <BookingProvider bookingPath="shop">
              <Seed />
              <ConfirmationStage />
              <StateProbe />
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

describe('ConfirmationStage — final design', () => {
  it('shows reference, service, date, time and professional', async () => {
    renderStage();
    expect(await screen.findByRole('heading', { name: /Booking confirmed/i })).toBeTruthy();
    expect(screen.getByText('preview-ABC123')).toBeTruthy();
    expect(screen.getByText('Deep Facial')).toBeTruthy();
    expect(screen.getByText('Mon, 20 Jul 2026')).toBeTruthy();
    expect(screen.getByText('10:00 AM')).toBeTruthy();
    expect(screen.getByText('Susi')).toBeTruthy();
  });

  it('marks preview confirmations visibly', async () => {
    renderStage();
    expect(await screen.findByText(/Design preview — no real booking was created/i)).toBeTruthy();
  });

  it('offers address (map) and phone (tel) contact actions', async () => {
    renderStage();
    const address = await screen.findByRole('link', { name: /1 Jalan Spa/ });
    expect(address.getAttribute('href')).toContain('google.com/maps');
    const phone = screen.getByRole('link', { name: /0123 456/ });
    expect(phone.getAttribute('href')).toBe('tel:0123456');
  });

  it('"Book another service" resets the booking and returns to the service stage', async () => {
    renderStage();
    await screen.findByRole('heading', { name: /Booking confirmed/i });
    const buttons = screen.getAllByRole('button', { name: /Book another service/i });
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/book-v2/shop/service'));
    expect(screen.getByTestId('svc').getAttribute('data-svc')).toBe('');
  });
});
