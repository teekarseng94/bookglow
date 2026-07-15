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
import DetailsStage from './DetailsStage';

const mLoadMerchant = vi.mocked(publicBookingAdapter.loadMerchantSummary);

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

/** Captures live booking state for assertions. */
function StateProbe() {
  const { state } = useBooking();
  return (
    <div
      data-testid="probe"
      data-name={state.customerDetails.fullName}
      data-notes={state.bookingNotes}
    />
  );
}

function LocationDisplay() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function renderStage() {
  return render(
    <MemoryRouter initialEntries={['/book-v2/shop/details']}>
      <Routes>
        <Route
          path="/book-v2/:bookingPath/*"
          element={
            <BookingProvider bookingPath="shop">
              <DetailsStage />
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

describe('DetailsStage — form and validation', () => {
  it('shows accessible inline errors after leaving invalid fields', async () => {
    renderStage();
    const name = await screen.findByLabelText(/Full name/i);
    fireEvent.change(name, { target: { value: 'J' } });
    fireEvent.blur(name);
    const error = await screen.findByRole('alert');
    expect(error.textContent).toMatch(/full name/i);
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(name.getAttribute('aria-describedby')).toBe(error.id);
  });

  it('flags an invalid email but accepts an empty one', async () => {
    renderStage();
    const email = await screen.findByLabelText(/Email/i);
    fireEvent.change(email, { target: { value: 'not-an-email' } });
    fireEvent.blur(email);
    expect(await screen.findByText(/valid email/i)).toBeTruthy();
    fireEvent.change(email, { target: { value: '' } });
    await waitFor(() => expect(screen.queryByText(/valid email/i)).toBeNull());
  });

  it('Continue is disabled until name and phone are valid, then navigates to review', async () => {
    renderStage();
    await screen.findByLabelText(/Full name/i);
    screen
      .getAllByRole('button', { name: 'Continue' })
      .forEach((b) => expect((b as HTMLButtonElement).disabled).toBe(true));

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Phone/i), { target: { value: '0123456789' } });

    const cont = await waitFor(() => {
      const b = screen.getAllByRole('button', { name: 'Continue' }).find((x) => !(x as HTMLButtonElement).disabled);
      if (!b) throw new Error('still disabled');
      return b;
    });
    fireEvent.click(cont);
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/book-v2/shop/review'));
  });

  it('binds fields and notes to the typed booking state', async () => {
    renderStage();
    fireEvent.change(await screen.findByLabelText(/Full name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Booking notes/i), { target: { value: 'Window seat' } });
    await waitFor(() => {
      const probe = screen.getByTestId('probe');
      expect(probe.getAttribute('data-name')).toBe('Jane Doe');
      expect(probe.getAttribute('data-notes')).toBe('Window seat');
    });
  });
});
