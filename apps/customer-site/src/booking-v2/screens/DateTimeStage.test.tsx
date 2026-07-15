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

vi.mock('../data/availability', () => ({
  availabilityAdapter: {
    loadDaySlots: vi.fn(),
  },
}));

import { publicBookingAdapter } from '../data/publicBookingAdapter';
import { availabilityAdapter, type LoadDaySlotsResult } from '../data/availability';
import { BookingProvider, useBooking } from '../state/BookingProvider';
import type { MerchantSummary } from '../state/bookingTypes';
import { formatLongDate, todayLocalISO } from '../utils/dates';
import DateTimeStage from './DateTimeStage';

const mLoadMerchant = vi.mocked(publicBookingAdapter.loadMerchantSummary);
const mLoadSlots = vi.mocked(availabilityAdapter.loadDaySlots);

function merchant(): MerchantSummary {
  return {
    outletId: 'outlet_1',
    bookingPath: 'shop',
    merchantName: 'Bali Wellness',
    outletName: 'Bali Wellness',
    logoUrl: null,
    coverImageUrl: null,
    address: null,
    phone: null,
    shortDescription: null,
    accentColor: null,
  };
}

const SLOTS: LoadDaySlotsResult = {
  status: 'ok',
  closed: false,
  isSample: true,
  slots: [
    { time: '10:00', label: '10:00 AM', available: true },
    { time: '10:30', label: '10:30 AM', available: false },
    { time: '11:00', label: '11:00 AM', available: true },
  ],
};

/** Seeds service + 'any' preference so the guard prerequisites are met. */
function Seed() {
  const { state, dispatch } = useBooking();
  React.useEffect(() => {
    if (!state.selectedService) {
      dispatch({
        type: 'SELECT_SERVICE',
        service: { id: 'svc-1', name: 'Svc', price: 10, durationMinutes: 30, category: null, currency: 'MYR' },
      });
      dispatch({ type: 'SET_PROFESSIONAL_PREFERENCE', preference: 'any' });
    }
  }, [dispatch, state.selectedService]);
  return null;
}

function LocationDisplay() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function renderStage() {
  return render(
    <MemoryRouter initialEntries={['/book-v2/shop/date-time']}>
      <Routes>
        <Route
          path="/book-v2/:bookingPath/*"
          element={
            <BookingProvider bookingPath="shop">
              <Seed />
              <DateTimeStage />
            </BookingProvider>
          }
        />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );
}

const todayLabel = formatLongDate(todayLocalISO());

beforeEach(() => {
  window.sessionStorage.clear();
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mLoadMerchant.mockResolvedValue({ status: 'ok', merchant: merchant() });
  mLoadSlots.mockResolvedValue(SLOTS);
});

afterEach(() => cleanup());

describe('DateTimeStage — calendar and slots', () => {
  it('renders the calendar and prompts for a date; Continue disabled', async () => {
    renderStage();
    expect(await screen.findByRole('button', { name: todayLabel })).toBeTruthy();
    expect(screen.getByText(/Select a date to see available times/i)).toBeTruthy();
    screen
      .getAllByRole('button', { name: 'Continue' })
      .forEach((b) => expect((b as HTMLButtonElement).disabled).toBe(true));
  });

  it('selecting a date loads slots; unavailable slots are disabled; sample note shown', async () => {
    renderStage();
    fireEvent.click(await screen.findByRole('button', { name: todayLabel }));
    const slot = await screen.findByRole('radio', { name: '10:00 AM' });
    expect((slot as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('radio', { name: '10:30 AM' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/sample times shown for design review/i)).toBeTruthy();
  });

  it('selecting a slot enables Continue and Continue opens the details stage', async () => {
    renderStage();
    fireEvent.click(await screen.findByRole('button', { name: todayLabel }));
    fireEvent.click(await screen.findByRole('radio', { name: '10:00 AM' }));
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: '10:00 AM' }).getAttribute('aria-checked')).toBe('true'),
    );
    const cont = screen.getAllByRole('button', { name: 'Continue' }).find((b) => !(b as HTMLButtonElement).disabled);
    expect(cont).toBeTruthy();
    fireEvent.click(cont!);
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/book-v2/shop/details'));
  });

  it('shows the closed state for a closed day', async () => {
    mLoadSlots.mockResolvedValue({ status: 'ok', closed: true, isSample: true, slots: [] });
    renderStage();
    fireEvent.click(await screen.findByRole('button', { name: todayLabel }));
    expect(await screen.findByText(/Closed on this date/i)).toBeTruthy();
  });

  it('shows the empty state when a day has no slots', async () => {
    mLoadSlots.mockResolvedValue({ status: 'ok', closed: false, isSample: true, slots: [] });
    renderStage();
    fireEvent.click(await screen.findByRole('button', { name: todayLabel }));
    expect(await screen.findByText(/No times available/i)).toBeTruthy();
  });

  it('shows an error state with retry that reloads slots', async () => {
    mLoadSlots.mockResolvedValueOnce({ status: 'error', message: 'Something went wrong. Please try again.' });
    renderStage();
    fireEvent.click(await screen.findByRole('button', { name: todayLabel }));
    expect(await screen.findByText(/Couldn't load times/i)).toBeTruthy();
    mLoadSlots.mockResolvedValue(SLOTS);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('radio', { name: '10:00 AM' })).toBeTruthy();
  });

  it('past days are disabled in the calendar', async () => {
    renderStage();
    await screen.findByRole('button', { name: todayLabel });
    const today = new Date();
    if (today.getDate() > 1) {
      // The 1st of the current month is in the past (unless today IS the 1st).
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const firstIso = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-01`;
      const firstBtn = screen.getByRole('button', { name: formatLongDate(firstIso) });
      expect((firstBtn as HTMLButtonElement).disabled).toBe(true);
    }
  });
});
