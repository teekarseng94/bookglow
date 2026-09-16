import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getSession: vi.fn(),
  resolveMerchantAccess: vi.fn(),
  merchantAccessDestination: vi.fn(() => '/dashboard'),
  readNativeOAuthCallback: vi.fn(async () => null),
  clearNativeOAuthCallback: vi.fn(async () => undefined),
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
}));

vi.mock('./nativeAuthStorage', async () => {
  const actual = await vi.importActual<typeof import('./nativeAuthStorage')>('./nativeAuthStorage');
  return {
    ...actual,
    readNativeOAuthCallback: mocks.readNativeOAuthCallback,
    clearNativeOAuthCallback: mocks.clearNativeOAuthCallback,
  };
});

import MerchantAuthCallback from './MerchantAuthCallback';

describe('MerchantAuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.readNativeOAuthCallback.mockResolvedValue(null);
    mocks.clearNativeOAuthCallback.mockResolvedValue(undefined);
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });
    mocks.resolveMerchantAccess.mockResolvedValue({ state: 'active', outletId: 'o1', role: 'owner' });
    mocks.merchantAccessDestination.mockReturnValue('/dashboard');
  });

  function renderCallback(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/auth/callback/merchant" element={<MerchantAuthCallback />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/onboarding" element={<div>Onboarding</div>} />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('completes Google return with PKCE code even when login intent was lost', async () => {
    renderCallback('/auth/callback/merchant?code=abc123');

    await waitFor(() => expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('abc123'));
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps an existing session when the one-time code was already exchanged', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: { message: 'invalid request: both auth code and code verifier should be non-empty' } });

    renderCallback('/auth/callback/merchant?code=used-code');

    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('recovers a dropped Android query string from native callback storage', async () => {
    mocks.readNativeOAuthCallback.mockResolvedValue('com.bookglow.merchant://auth/callback/merchant?code=android-code');

    renderCallback('/auth/callback/merchant');

    await waitFor(() => expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('android-code'));
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
  });

  it('exchanges a PKCE code kept in the Capacitor hash after WebView reload', async () => {
    vi.stubGlobal('location', {
      ...window.location,
      hash: '?code=hash-code',
      search: '',
      href: 'https://localhost/auth/callback/merchant#?code=hash-code',
    });

    renderCallback('/auth/callback/merchant');

    await waitFor(() => expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('hash-code'));
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
  });

  it('routes no_workspace through shared access resolver destination', async () => {
    sessionStorage.setItem('bookglow.merchantAuthIntent', 'login');
    mocks.resolveMerchantAccess.mockResolvedValue({ state: 'no_workspace', outletId: null, role: null });
    mocks.merchantAccessDestination.mockReturnValue('/onboarding');

    renderCallback('/auth/callback/merchant?code=new-user');

    await waitFor(() => expect(screen.getByText('Onboarding')).toBeInTheDocument());
  });
});
