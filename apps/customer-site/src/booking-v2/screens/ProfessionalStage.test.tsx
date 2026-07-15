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
import { bookingReducer } from '../state/bookingReducer';
import { createInitialBookingState } from '../state/bookingInitialState';
import type { MerchantSummary, BookingV2State } from '../state/bookingTypes';
import type { LoadStaffResult, PublicStaff } from '../data/publicBookingTypes';
import ProfessionalStage from './ProfessionalStage';

const mLoadMerchant = vi.mocked(publicBookingAdapter.loadMerchantSummary);
const mLoadStaff = vi.mocked(publicBookingAdapter.loadStaff);

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

function staff(id: string, name: string, qualifiedServices: string[], photoUrl: string | null = null): PublicStaff {
  return { id, name, role: 'Therapist', photoUrl, qualifiedServices };
}

const STAFF: LoadStaffResult = {
  status: 'ok',
  staff: [
    staff('all', 'Anie', []), // qualified for all
    staff('svc1', 'Bella', ['svc-1']), // qualified for svc-1
    staff('svc2', 'Cara', ['svc-2']), // NOT qualified for svc-1
  ],
};

/** Seeds a selected service so qualification filtering has a target. */
function Seed({ serviceId }: { serviceId: string }) {
  const { state, dispatch } = useBooking();
  React.useEffect(() => {
    if (!state.selectedService) {
      dispatch({
        type: 'SELECT_SERVICE',
        service: { id: serviceId, name: 'Svc', price: 10, durationMinutes: 30, category: null, currency: 'MYR' },
      });
    }
  }, [dispatch, serviceId, state.selectedService]);
  return null;
}

function LocationDisplay() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function renderStage(serviceId = 'svc-1') {
  return render(
    <MemoryRouter initialEntries={['/book-v2/shop/professional']}>
      <Routes>
        <Route
          path="/book-v2/:bookingPath/*"
          element={
            <BookingProvider bookingPath="shop">
              <Seed serviceId={serviceId} />
              <ProfessionalStage />
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
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mLoadMerchant.mockResolvedValue({ status: 'ok', merchant: merchant() });
  mLoadStaff.mockResolvedValue(STAFF);
});

afterEach(() => cleanup());

describe('ProfessionalStage — staff selection', () => {
  it('renders Any available + qualified staff, excludes unqualified, no dev fixtures', async () => {
    renderStage('svc-1');
    expect(await screen.findByRole('radio', { name: /Any available professional/i })).toBeTruthy();
    expect(await screen.findByRole('radio', { name: /Anie/ })).toBeTruthy(); // qualified-for-all
    expect(screen.getByRole('radio', { name: /Bella/ })).toBeTruthy(); // qualified for svc-1
    expect(screen.queryByRole('radio', { name: /Cara/ })).toBeNull(); // svc-2 only -> excluded
    expect(screen.queryByText(/Sample professional/i)).toBeNull();
    expect(screen.queryByText(/dev-pro/i)).toBeNull();
  });

  it('shows the Any option as recommended and first', async () => {
    renderStage('svc-1');
    const radios = await screen.findAllByRole('radio');
    expect(radios[0].textContent).toMatch(/Any available professional/i);
    expect(radios[0].textContent).toMatch(/Recommended/i);
  });

  it('selecting Any sets preference and enables Continue', async () => {
    renderStage('svc-1');
    const any = await screen.findByRole('radio', { name: /Any available professional/i });
    fireEvent.click(any);
    await waitFor(() => expect(any.getAttribute('aria-checked')).toBe('true'));
    expect(screen.getAllByRole('button', { name: 'Continue' }).some((b) => !(b as HTMLButtonElement).disabled)).toBe(true);
  });

  it('selecting a specific professional sets preference specific + that staff', async () => {
    renderStage('svc-1');
    const bella = await screen.findByRole('radio', { name: /Bella/ });
    fireEvent.click(bella);
    await waitFor(() => expect(screen.getByRole('radio', { name: /Bella/ }).getAttribute('aria-checked')).toBe('true'));
    expect(screen.getByRole('radio', { name: /Any available professional/i }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getAllByRole('button', { name: 'Continue' }).some((b) => !(b as HTMLButtonElement).disabled)).toBe(true);
  });

  it('Continue is disabled until a preference is chosen', async () => {
    renderStage('svc-1');
    await screen.findByRole('radio', { name: /Any available professional/i });
    screen.getAllByRole('button', { name: 'Continue' }).forEach((b) => expect((b as HTMLButtonElement).disabled).toBe(true));
  });

  it('Continue navigates to the date-time stage', async () => {
    renderStage('svc-1');
    fireEvent.click(await screen.findByRole('radio', { name: /Any available professional/i }));
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Any available professional/i }).getAttribute('aria-checked')).toBe('true'),
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Continue' }).find((b) => !(b as HTMLButtonElement).disabled)!);
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/book-v2/shop/date-time'));
  });

  it('renders an initials fallback for staff without a photo', async () => {
    renderStage('svc-1');
    // Anie has no photo -> initials "A" should appear, no <img> for her card.
    const anie = await screen.findByRole('radio', { name: /Anie/ });
    expect(anie.querySelector('img')).toBeNull();
    expect(anie.textContent).toContain('A');
  });
});

describe('ProfessionalStage — data states', () => {
  it('shows a loading skeleton while staff load', async () => {
    let resolve: (r: LoadStaffResult) => void = () => {};
    mLoadStaff.mockReturnValue(new Promise<LoadStaffResult>((r) => (resolve = r)));
    const { container } = renderStage('svc-1');
    await screen.findByRole('heading', { name: 'Bali Wellness' });
    await waitFor(() => expect(container.querySelector('.bgv2-pro-card--skeleton')).not.toBeNull());
    resolve(STAFF);
    expect(await screen.findByRole('radio', { name: /Anie/ })).toBeTruthy();
  });

  it('shows an error state with retry that reloads staff', async () => {
    mLoadStaff.mockResolvedValueOnce({ status: 'error', message: 'Something went wrong. Please try again.' });
    renderStage('svc-1');
    expect(await screen.findByText(/Couldn't load professionals/i)).toBeTruthy();
    // No raw error text.
    expect(screen.queryByText(/Firebase|permission/i)).toBeNull();
    mLoadStaff.mockResolvedValue(STAFF);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('radio', { name: /Anie/ })).toBeTruthy();
  });

  it('blocks the stage when zero staff records exist (no Any option, contact shown)', async () => {
    mLoadMerchant.mockResolvedValue({
      status: 'ok',
      merchant: { ...merchant(), phone: '0123 456', address: '1 Jalan Spa' },
    });
    mLoadStaff.mockResolvedValue({ status: 'ok', staff: [] });
    renderStage('svc-1');
    expect(await screen.findByText(/No professionals available/i)).toBeTruthy();
    // "Any available" must NOT be offered.
    expect(screen.queryByRole('radio', { name: /Any available professional/i })).toBeNull();
    // Merchant contact details are shown (storefront header + empty state).
    expect(screen.getAllByRole('link', { name: '0123 456' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 Jalan Spa/).length).toBeGreaterThan(0);
    // Continue stays disabled.
    screen
      .getAllByRole('button', { name: 'Continue' })
      .forEach((b) => expect((b as HTMLButtonElement).disabled).toBe(true));
  });

  it('blocks the stage when no staff is qualified for the selected service', async () => {
    mLoadStaff.mockResolvedValue({ status: 'ok', staff: [staff('svc2', 'Cara', ['svc-2'])] });
    renderStage('svc-1'); // Cara is not qualified for svc-1 -> zero qualified
    expect(await screen.findByText(/No professionals available/i)).toBeTruthy();
    expect(screen.queryByRole('radio', { name: /Any available professional/i })).toBeNull();
    expect(screen.queryByRole('radio', { name: /Cara/ })).toBeNull();
    screen
      .getAllByRole('button', { name: 'Continue' })
      .forEach((b) => expect((b as HTMLButtonElement).disabled).toBe(true));
  });

  it('Continue stays disabled with a restored "any" preference but zero qualified staff', async () => {
    mLoadStaff.mockResolvedValue({ status: 'ok', staff: [] });
    // Simulate a previously persisted 'any' preference for this path.
    window.sessionStorage.setItem(
      'bookglow:booking-v2:shop:v1',
      JSON.stringify({
        version: 1,
        bookingPath: 'shop',
        outletId: 'outlet_1',
        merchant: null,
        selectedService: { id: 'svc-1', name: 'Svc', price: 10, durationMinutes: 30, category: null, currency: 'MYR' },
        professionalPreference: 'any',
        selectedProfessional: null,
        selectedDate: null,
        selectedTimeSlot: null,
        customerDetails: { fullName: '', phone: '', email: '' },
        bookingNotes: '',
        currentStage: 'professional',
        submissionStatus: 'idle',
        confirmation: null,
        errors: [],
      }),
    );
    renderStage('svc-1');
    expect(await screen.findByText(/No professionals available/i)).toBeTruthy();
    screen
      .getAllByRole('button', { name: 'Continue' })
      .forEach((b) => expect((b as HTMLButtonElement).disabled).toBe(true));
  });
});

describe('ProfessionalStage — state invalidation (reducer)', () => {
  /** State with everything through date & time selected. */
  function withDateTime(): BookingV2State {
    let s = createInitialBookingState('shop');
    s = bookingReducer(s, { type: 'SET_MERCHANT', merchant: merchant() });
    s = bookingReducer(s, {
      type: 'SELECT_SERVICE',
      service: { id: 'svc-1', name: 'S', price: 10, durationMinutes: 30, category: null, currency: 'MYR' },
    });
    s = bookingReducer(s, { type: 'SET_PROFESSIONAL_PREFERENCE', preference: 'specific' });
    s = bookingReducer(s, { type: 'SELECT_PROFESSIONAL', professional: { id: 'p1', name: 'Bella', photoUrl: null } });
    s = bookingReducer(s, { type: 'SELECT_DATE', date: '2026-07-20' });
    s = bookingReducer(s, { type: 'SELECT_TIME_SLOT', slot: { time: '10:00' } });
    return s;
  }

  it('changing the professional (stage dispatch flow) clears date and time', () => {
    let s = withDateTime();
    // Mirror the stage: SET_PROFESSIONAL_PREFERENCE 'specific' then SELECT_PROFESSIONAL.
    s = bookingReducer(s, { type: 'SET_PROFESSIONAL_PREFERENCE', preference: 'specific' });
    s = bookingReducer(s, { type: 'SELECT_PROFESSIONAL', professional: { id: 'p2', name: 'Cara', photoUrl: null } });
    expect(s.selectedProfessional?.id).toBe('p2');
    expect(s.selectedDate).toBeNull();
    expect(s.selectedTimeSlot).toBeNull();
  });

  it("switching to 'Any' clears the specific professional, date and time", () => {
    let s = withDateTime();
    s = bookingReducer(s, { type: 'SET_PROFESSIONAL_PREFERENCE', preference: 'any' });
    expect(s.professionalPreference).toBe('any');
    expect(s.selectedProfessional).toBeNull();
    expect(s.selectedDate).toBeNull();
    expect(s.selectedTimeSlot).toBeNull();
  });
});
