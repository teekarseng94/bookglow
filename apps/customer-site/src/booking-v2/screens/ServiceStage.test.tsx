import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock the data adapter so no Firestore is touched.
vi.mock('../data/publicBookingAdapter', () => ({
  publicBookingAdapter: {
    loadMerchantSummary: vi.fn(),
    loadServiceCatalogue: vi.fn(),
  },
}));

import { publicBookingAdapter } from '../data/publicBookingAdapter';
import { BookingProvider } from '../state/BookingProvider';
import { isDevFixtureId } from '../state/bookingSelectors';
import type { MerchantSummary, PublicService } from '../state/bookingTypes';
import type { LoadServicesResult } from '../data/publicBookingTypes';
import ServiceStage from './ServiceStage';

const mLoadMerchant = vi.mocked(publicBookingAdapter.loadMerchantSummary);
const mLoadCatalogue = vi.mocked(publicBookingAdapter.loadServiceCatalogue);

function merchant(): MerchantSummary {
  return {
    outletId: 'outlet_1',
    bookingPath: 'shop',
    merchantName: 'Bali Wellness',
    outletName: 'Bali Wellness',
    logoUrl: null,
    coverImageUrl: null,
    address: '1 Jalan',
    phone: '012',
    shortDescription: 'Calm spa',
    accentColor: null,
  };
}

function svc(id: string, name: string, category: string): PublicService {
  return {
    id,
    name,
    description: `${name} description`,
    categoryId: category.toLowerCase(),
    categoryName: category,
    durationMinutes: 45,
    price: 80,
    currency: 'MYR',
    imageUrl: null,
    isActive: true,
    isPubliclyBookable: true,
    sortOrder: null,
  };
}

const CATALOGUE: LoadServicesResult = {
  status: 'ok',
  services: [
    svc('svc-1', 'Deep Facial', 'Face'),
    svc('svc-2', 'Swedish Massage', 'Massage'),
    svc('svc-3', 'Glow Facial', 'Face'),
    svc('svc-4', 'Aroma Massage', 'Massage'),
    svc('svc-5', 'Manicure', 'Nails'),
    svc('svc-6', 'Pedicure', 'Nails'),
  ],
  categories: [
    { id: 'face', name: 'Face', count: 2 },
    { id: 'massage', name: 'Massage', count: 2 },
    { id: 'nails', name: 'Nails', count: 2 },
  ],
};

function renderStage() {
  return render(
    <MemoryRouter initialEntries={['/book-v2/shop/service']}>
      <Routes>
        <Route
          path="/book-v2/:bookingPath/*"
          element={
            <BookingProvider bookingPath="shop">
              <ServiceStage />
            </BookingProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  vi.clearAllMocks();
  mLoadMerchant.mockResolvedValue({ status: 'ok', merchant: merchant() });
  mLoadCatalogue.mockResolvedValue(CATALOGUE);
});

afterEach(() => cleanup());

describe('ServiceStage — storefront & selection', () => {
  it('renders the merchant storefront and real services (no dev fixtures)', async () => {
    renderStage();
    expect(await screen.findByRole('heading', { name: 'Bali Wellness' })).toBeTruthy();
    expect(await screen.findByRole('radio', { name: /Deep Facial/ })).toBeTruthy();
    // No development fixtures on screen.
    expect(screen.queryByText(/Sample service/i)).toBeNull();
    expect(screen.queryByText(/dev-service/i)).toBeNull();
  });

  it('Continue is disabled until a service is selected', async () => {
    renderStage();
    await screen.findByRole('radio', { name: /Deep Facial/ });
    const continueButtons = screen.getAllByRole('button', { name: 'Continue' });
    continueButtons.forEach((b) => expect((b as HTMLButtonElement).disabled).toBe(true));
  });

  it('selecting a service updates state and enables Continue', async () => {
    renderStage();
    const card = await screen.findByRole('radio', { name: /Deep Facial/ });
    fireEvent.click(card);
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Deep Facial/ }).getAttribute('aria-checked')).toBe('true'),
    );
    const continueButtons = screen.getAllByRole('button', { name: 'Continue' });
    expect(continueButtons.some((b) => !(b as HTMLButtonElement).disabled)).toBe(true);
    // Real id, never treated as a development fixture.
    expect(isDevFixtureId('svc-1')).toBe(false);
  });

  it('selecting another service replaces the previous selection', async () => {
    renderStage();
    fireEvent.click(await screen.findByRole('radio', { name: /Deep Facial/ }));
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Deep Facial/ }).getAttribute('aria-checked')).toBe('true'),
    );
    fireEvent.click(screen.getByRole('radio', { name: /Swedish Massage/ }));
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Swedish Massage/ }).getAttribute('aria-checked')).toBe('true'),
    );
    expect(screen.getByRole('radio', { name: /Deep Facial/ }).getAttribute('aria-checked')).toBe('false');
  });

  it('preserves the selected service across category changes', async () => {
    renderStage();
    fireEvent.click(await screen.findByRole('radio', { name: /Deep Facial/ }));
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Deep Facial/ }).getAttribute('aria-checked')).toBe('true'),
    );
    // Switch to a category that does not contain the selection.
    fireEvent.click(screen.getByRole('button', { name: 'Massage' }));
    await waitFor(() => expect(screen.queryByRole('radio', { name: /Deep Facial/ })).toBeNull());
    // Back to all — the selection survived.
    fireEvent.click(screen.getByRole('button', { name: 'All services' }));
    expect(
      (await screen.findByRole('radio', { name: /Deep Facial/ })).getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('filters by category', async () => {
    renderStage();
    await screen.findByRole('radio', { name: /Deep Facial/ });
    fireEvent.click(screen.getByRole('button', { name: 'Nails' }));
    await waitFor(() => expect(screen.queryByRole('radio', { name: /Deep Facial/ })).toBeNull());
    expect(screen.getByRole('radio', { name: /Manicure/ })).toBeTruthy();
  });

  it('shows a no-results state with a reset action when search matches nothing', async () => {
    renderStage();
    await screen.findByRole('radio', { name: /Deep Facial/ });
    fireEvent.change(screen.getByRole('searchbox', { name: /search services/i }), {
      target: { value: 'zzzz-nothing' },
    });
    expect(await screen.findByText(/No services match your search/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(await screen.findByRole('radio', { name: /Deep Facial/ })).toBeTruthy();
  });
});

describe('ServiceStage — data states', () => {
  it('shows a loading skeleton while the catalogue loads', async () => {
    let resolve: (r: LoadServicesResult) => void = () => {};
    mLoadCatalogue.mockReturnValue(new Promise<LoadServicesResult>((r) => (resolve = r)));
    const { container } = renderStage();
    // Storefront (merchant) resolves; services still pending -> skeleton.
    await screen.findByRole('heading', { name: 'Bali Wellness' });
    await waitFor(() => expect(container.querySelector('.bgv2-service-skeleton')).not.toBeNull());
    expect(screen.queryByRole('radio')).toBeNull();
    resolve(CATALOGUE);
    expect(await screen.findByRole('radio', { name: /Deep Facial/ })).toBeTruthy();
  });

  it('shows the no-services state with contact when the catalogue is empty', async () => {
    mLoadCatalogue.mockResolvedValue({ status: 'ok', services: [], categories: [] });
    renderStage();
    expect(await screen.findByText(/No services are currently available/i)).toBeTruthy();
    // Phone appears in the storefront header and the empty-state contact.
    expect(screen.getAllByText('012').length).toBeGreaterThan(0);
  });

  it('shows an error state with retry that reloads the catalogue', async () => {
    mLoadCatalogue.mockResolvedValueOnce({ status: 'error', message: 'boom' });
    renderStage();
    expect(await screen.findByText(/Couldn't load services/i)).toBeTruthy();
    mLoadCatalogue.mockResolvedValue(CATALOGUE);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('radio', { name: /Deep Facial/ })).toBeTruthy();
  });
});
