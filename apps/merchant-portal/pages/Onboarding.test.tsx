import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  loading: false,
  isAuthenticated: true,
  user: { email: 'new@example.com' } as { email: string } | null,
}));

const access = vi.hoisted(() => ({
  resolveMerchantAccess: vi.fn(async () => ({ state: 'no_workspace', outletId: null })),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    loading: auth.loading,
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
  }),
}));

vi.mock('../src/auth/accessResolver', () => ({
  resolveMerchantAccess: () => access.resolveMerchantAccess(),
}));

vi.mock('../../customer-site/apps/merchant-onboarding/MerchantOnboardingWizard', () => ({
  default: ({ email }: { email: string }) => <div>Account setup for {email}</div>,
}));

vi.mock('../services/authService', () => ({ logout: vi.fn() }));

import MerchantOnboardingPage from './Onboarding';

beforeEach(() => {
  auth.loading = false;
  auth.isAuthenticated = true;
  auth.user = { email: 'new@example.com' };
  access.resolveMerchantAccess.mockResolvedValue({ state: 'no_workspace', outletId: null });
});

afterEach(cleanup);

describe('merchant onboarding page', () => {
  it('sends signed-out users back to login', async () => {
    auth.loading = false;
    auth.isAuthenticated = false;
    auth.user = null;
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/login" element={<div>Merchant login</div>} />
          <Route path="/onboarding" element={<MerchantOnboardingPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Merchant login')).toBeTruthy();
  });

  it('opens the questionnaire for a signed-in Google account without an outlet', async () => {
    auth.loading = false;
    auth.isAuthenticated = true;
    auth.user = { email: 'new@example.com' };
    access.resolveMerchantAccess.mockResolvedValue({ state: 'no_workspace', outletId: null });
    render(
      <MemoryRouter>
        <MerchantOnboardingPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Account setup for new@example.com')).toBeTruthy();
  });

  it('sends existing merchants with an outlet to the dashboard instead of looping', async () => {
    auth.loading = false;
    auth.isAuthenticated = true;
    auth.user = { email: 'owner@example.com' };
    access.resolveMerchantAccess.mockResolvedValue({ state: 'active', outletId: 'outlet-1' });
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<MerchantOnboardingPage />} />
          <Route path="/dashboard" element={<div>Merchant dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('Merchant dashboard')).toBeTruthy());
    expect(screen.queryByText(/Account setup/)).toBeNull();
  });
});
