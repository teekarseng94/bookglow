import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Firestore-facing layer so the adapter is tested in isolation.
vi.mock('./publicBookingApi', () => ({
  resolveOutletId: vi.fn(),
  fetchOutletProfile: vi.fn(),
  fetchServices: vi.fn(),
  fetchStaff: vi.fn(),
}));

import { publicBookingAdapter, GENERIC_LOAD_ERROR } from './publicBookingAdapter';
import {
  resolveOutletId,
  fetchOutletProfile,
  fetchServices,
  fetchStaff,
} from './publicBookingApi';

const mResolve = vi.mocked(resolveOutletId);
const mProfile = vi.mocked(fetchOutletProfile);
const mServices = vi.mocked(fetchServices);
const mStaff = vi.mocked(fetchStaff);

beforeEach(() => {
  vi.clearAllMocks();
  // Silence the intentional error logging from reportError.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('loadMerchantSummary', () => {
  it('maps a valid merchant profile', async () => {
    mResolve.mockResolvedValue('outlet_1');
    mProfile.mockResolvedValue({
      name: 'Bali Wellness',
      addressDisplay: '1 Jalan',
      phoneNumber: '012',
      logoUrl: 'l.png',
      coverImageUrl: 'c.png',
      accentColor: '#123456',
      shortDescription: 'Calm spa',
    });
    const r = await publicBookingAdapter.loadMerchantSummary('bali');
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.merchant).toMatchObject({
      outletId: 'outlet_1',
      bookingPath: 'bali',
      merchantName: 'Bali Wellness',
      address: '1 Jalan',
      phone: '012',
      shortDescription: 'Calm spa',
      accentColor: '#123456',
    });
  });

  it('maps missing optional fields to null', async () => {
    mResolve.mockResolvedValue('outlet_1');
    mProfile.mockResolvedValue({ name: 'Solo Shop' });
    const r = await publicBookingAdapter.loadMerchantSummary('solo');
    if (r.status !== 'ok') throw new Error('expected ok');
    expect(r.merchant.logoUrl).toBeNull();
    expect(r.merchant.coverImageUrl).toBeNull();
    expect(r.merchant.address).toBeNull();
    expect(r.merchant.phone).toBeNull();
    expect(r.merchant.shortDescription).toBeNull();
    expect(r.merchant.accentColor).toBeNull();
  });

  it('returns not-found when the path does not resolve', async () => {
    mResolve.mockResolvedValue(null);
    expect((await publicBookingAdapter.loadMerchantSummary('nope')).status).toBe('not-found');
  });

  it('returns not-found when the outlet document is missing', async () => {
    mResolve.mockResolvedValue('outlet_1');
    mProfile.mockResolvedValue(null);
    expect((await publicBookingAdapter.loadMerchantSummary('x')).status).toBe('not-found');
  });

  it('returns disabled (with merchant) when booking is disabled', async () => {
    mResolve.mockResolvedValue('outlet_1');
    mProfile.mockResolvedValue({ name: 'Closed Co', phoneNumber: '999', bookingEnabled: false });
    const r = await publicBookingAdapter.loadMerchantSummary('closed');
    expect(r.status).toBe('disabled');
    if (r.status !== 'disabled') return;
    expect(r.merchant.phone).toBe('999');
  });

  it('returns error when profile loading throws', async () => {
    mResolve.mockResolvedValue('outlet_1');
    mProfile.mockRejectedValue(new Error('boom'));
    const r = await publicBookingAdapter.loadMerchantSummary('x');
    expect(r.status).toBe('error');
  });

  it('never surfaces raw Firebase error text — only the governed generic message', async () => {
    mResolve.mockResolvedValue('outlet_1');
    mProfile.mockRejectedValue(new Error('FirebaseError: PERMISSION_DENIED internal detail'));
    const r = await publicBookingAdapter.loadMerchantSummary('x');
    if (r.status !== 'error') throw new Error('expected error');
    expect(r.message).toBe(GENERIC_LOAD_ERROR);
    expect(r.message).not.toMatch(/Firebase|PERMISSION_DENIED|internal/);
  });
});

describe('loadServiceCatalogue', () => {
  it('maps, filters and sorts services with categories', async () => {
    mProfile.mockResolvedValue({ name: 'Shop', serviceCategories: ['Massage', 'Face'], currency: 'MYR' });
    mServices.mockResolvedValue([
      { id: 'a', name: 'Deep Facial', price: 80, duration: 45, category: 'Face' },
      { id: 'b', name: 'Aroma', price: 100, duration: 60, category: 'Massage' },
      { id: 'hidden', name: 'Secret', price: 10, duration: 30, category: 'Face', isVisible: false },
      { id: 'bad', name: 'Bad', price: -1, duration: 30, category: 'Face' },
    ]);
    const r = await publicBookingAdapter.loadServiceCatalogue('outlet_1');
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.services.map((s) => s.id)).toEqual(['b', 'a']); // Massage before Face
    expect(r.categories.map((c) => c.name)).toEqual(['Massage', 'Face']);
  });

  it('returns error when service loading throws', async () => {
    mProfile.mockResolvedValue({ name: 'Shop' });
    mServices.mockRejectedValue(new Error('network'));
    const r = await publicBookingAdapter.loadServiceCatalogue('outlet_1');
    expect(r.status).toBe('error');
  });

  it('errors on a blank outlet id without hitting the network', async () => {
    const r = await publicBookingAdapter.loadServiceCatalogue('');
    expect(r.status).toBe('error');
    expect(mServices).not.toHaveBeenCalled();
  });
});

describe('loadStaff', () => {
  it('maps public staff and sorts by name', async () => {
    mStaff.mockResolvedValue([
      { id: 'z', name: 'Zara', role: 'Senior', profilePicture: 'z.jpg', qualifiedServices: ['svc-1'] },
      { id: 'a', name: 'Anie', role: 'Therapist', qualifiedServices: [] },
    ]);
    const r = await publicBookingAdapter.loadStaff('outlet_1');
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.staff.map((s) => s.id)).toEqual(['a', 'z']);
    expect(r.staff[0]).toEqual({
      id: 'a',
      name: 'Anie',
      role: 'Therapist',
      photoUrl: null,
      qualifiedServices: [],
    });
  });

  it('returns a governed error (no raw text) when staff loading throws', async () => {
    mStaff.mockRejectedValue(new Error('FirebaseError: unavailable'));
    const r = await publicBookingAdapter.loadStaff('outlet_1');
    expect(r.status).toBe('error');
    if (r.status !== 'error') return;
    expect(r.message).toBe(GENERIC_LOAD_ERROR);
    expect(r.message).not.toMatch(/Firebase|unavailable/);
  });

  it('errors on a blank outlet id without hitting the network', async () => {
    const r = await publicBookingAdapter.loadStaff('  ');
    expect(r.status).toBe('error');
    expect(mStaff).not.toHaveBeenCalled();
  });
});
