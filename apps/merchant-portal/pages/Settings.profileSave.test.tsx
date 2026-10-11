import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OutletSettings } from '../types';

const getById = vi.hoisted(() => vi.fn());
const getByBookingSlug = vi.hoisted(() => vi.fn());
const updateOutlet = vi.hoisted(() => vi.fn());

vi.mock('../contexts/UserContext', () => ({
  useUserContext: () => ({
    outletId: 'outlet_002',
    outletName: 'Sohokaki Wellness Center',
    role: 'admin',
    loading: false,
  }),
}));

vi.mock('../services/databaseService', () => ({
  outletService: {
    getById,
    getByBookingSlug,
    update: updateOutlet,
  },
}));

vi.mock('../services/teamAccessService', () => ({
  listOutletAccounts: vi.fn(async () => []),
  inviteOutletAccount: vi.fn(),
  setOutletAccountStatus: vi.fn(),
}));

vi.mock('../services/accountDeletionService', () => ({
  accountDeletionService: { currentStatus: vi.fn(async () => null) },
}));

vi.mock('../services/authService', () => ({
  verifyMerchantAccountForDeletion: vi.fn(),
}));

import Settings from './Settings';

const settings: OutletSettings = {
  shopName: 'Sohokaki Wellness Center',
  isOutletModeEnabled: false,
  isAdminAuthenticated: false,
  lockedFeatures: [],
  paymentMethods: ['Cash'],
  reminderEnabled: false,
  reminderTiming: 24,
  reminderChannel: 'Email',
  primaryBusinessCategory: 'Spa',
  businessCategories: ['Wellness'],
  teamSize: '2-5',
  serviceLocationType: 'physical',
  previousSoftware: 'None',
};

function mockViewport(phone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('max-width') ? phone : !phone,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('Settings business profile and booking path', () => {
  beforeEach(() => {
    getById.mockReset();
    getByBookingSlug.mockReset();
    updateOutlet.mockReset();
    getById.mockResolvedValue({
      outletID: 'outlet_002',
      name: settings.shopName,
      bookingSlug: 'sohokakiWellnessCenter',
      website: 'https://www.example.com',
    });
    getByBookingSlug.mockResolvedValue(null);
    updateOutlet.mockResolvedValue(undefined);
  });

  it('keeps phone profile edits until Save, and locks the booking path to the shop name', async () => {
    mockViewport(true);
    const onUpdateSettings = vi.fn();
    render(<Settings settings={settings} onUpdateSettings={onUpdateSettings} outletId="outlet_002" />);

    const shopName = await screen.findByLabelText('Shop name');
    fireEvent.change(shopName, { target: { value: 'Harbour Spa' } });
    expect(onUpdateSettings).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));

    await waitFor(() => {
      expect(onUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({ shopName: 'Harbour Spa' }));
    });
    expect(updateOutlet).toHaveBeenCalledWith('outlet_002', { website: 'https://www.example.com' });
    expect(updateOutlet).toHaveBeenCalledWith('outlet_002', { bookingSlug: 'harbourSpa' });

    const path = screen.getByLabelText('Booking page path');
    expect(path).toHaveAttribute('readonly');
    expect(path).toHaveValue('sohokakiWellnessCenter');
  });
});
