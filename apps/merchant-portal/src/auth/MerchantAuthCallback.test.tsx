import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getSession: vi.fn(),
  resolveMerchantAccess: vi.fn(),
  merchantAccessDestination: vi.fn(() => '/dashboard'),
  merchantBrowserDestination: vi.fn((path: string) => `/#${path}`),
}));

vi.mock('@bookglow/supabase', () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      getSession: mocks.getSession,
    },
    rpc: vi.fn(),
  }),
}));

vi.mock('./accessResolver', () => ({
  resolveMerchantAccess: mocks.resolveMerchantAccess,
  merchantAccessDestination: mocks.merchantAccessDestination,
  merchantBrowserDestination: mocks.merchantBrowserDestination,
}));

import MerchantAuthCallback from './MerchantAuthCallback';

describe('MerchantAuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });
    mocks.resolveMerchantAccess.mockResolvedValue({ state: 'active', outletId: 'o1', role: 'owner' });
    vi.stubGlobal('location', { ...window.location, replace: vi.fn(), hash: '', search: '' });
  });

  it('completes Google return with PKCE code even when login intent was lost', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/callback/merchant?code=abc123']}>
        <Routes>
          <Route path="/auth/callback/merchant" element={<MerchantAuthCallback />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('abc123'));
    await waitFor(() => expect(mocks.resolveMerchantAccess).toHaveBeenCalled());
    expect(window.location.replace).toHaveBeenCalledWith('/#/dashboard');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('routes no_workspace through shared access resolver destination', async () => {
    sessionStorage.setItem('bookglow.merchantAuthIntent', 'login');
    mocks.resolveMerchantAccess.mockResolvedValue({ state: 'no_workspace', outletId: null, role: null });
    mocks.merchantAccessDestination.mockReturnValue('/access/no-workspace');

    render(
      <MemoryRouter initialEntries={['/auth/callback/merchant?code=new-user']}>
        <Routes>
          <Route path="/auth/callback/merchant" element={<MerchantAuthCallback />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(window.location.replace).toHaveBeenCalledWith('/#/access/no-workspace'));
  });
});
