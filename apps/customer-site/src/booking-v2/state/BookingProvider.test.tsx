import React, { useState } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BookingProvider, useBooking } from './BookingProvider';

// Mock the data adapter so the provider never touches Firestore in tests.
vi.mock('../data/publicBookingAdapter', () => ({
  publicBookingAdapter: {
    loadMerchantSummary: vi.fn().mockResolvedValue({ status: 'not-found' }),
  },
}));

function Consumer() {
  const { state, dispatch } = useBooking();
  return (
    <div>
      <span data-testid="svc">{state.selectedService?.id ?? 'none'}</span>
      <span data-testid="path">{state.bookingPath ?? 'null'}</span>
      <button
        type="button"
        onClick={() =>
          dispatch({
            type: 'SELECT_SERVICE',
            service: { id: 'svc-a', name: 'A', price: 1, durationMinutes: 30, category: null, currency: 'MYR' },
          })
        }
      >
        pick
      </button>
    </div>
  );
}

/** Harness that swaps the booking path, keying the provider on it (as routes do). */
function Harness() {
  const [path, setPath] = useState('merchant-a');
  return (
    <>
      <button type="button" onClick={() => setPath('merchant-b')}>
        go-b
      </button>
      <BookingProvider key={path} bookingPath={path}>
        <Consumer />
      </BookingProvider>
    </>
  );
}

describe('BookingProvider merchant isolation via key remount', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  // Deterministic teardown so rendered trees never leak between tests/files
  // (important under the single-fork pool).
  afterEach(() => {
    cleanup();
  });

  it('starts merchant B with clean selections after merchant A made a selection', async () => {
    render(<Harness />);

    // Merchant A: select a service.
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('merchant-a'));
    fireEvent.click(screen.getByText('pick'));
    expect(screen.getByTestId('svc').textContent).toBe('svc-a');

    // Navigate to merchant B — provider key changes, forcing a fresh instance.
    fireEvent.click(screen.getByText('go-b'));

    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('merchant-b'));
    // Merchant A's selection must NOT survive into merchant B.
    expect(screen.getByTestId('svc').textContent).toBe('none');
  });

  it('does not reuse merchant A sessionStorage for merchant B', async () => {
    render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('merchant-a'));
    fireEvent.click(screen.getByText('pick'));

    // Merchant A persisted under its own key; merchant B has a separate key.
    fireEvent.click(screen.getByText('go-b'));
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('merchant-b'));
    expect(screen.getByTestId('svc').textContent).toBe('none');
  });
});
