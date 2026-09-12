import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
}));

vi.mock('@bookglow/supabase', () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      signInWithOAuth: mocks.signInWithOAuth,
    },
  }),
}));

import {
  registerMerchantWithEmail,
  registerMerchantWithProvider, isMerchantProviderEnabled, merchantOAuthReturnError,
  signInMerchantForOnboarding,
} from '../../services/merchantAuthService';

describe('merchant email authentication', () => {
  beforeEach(() => {
    mocks.signUp.mockReset();
    mocks.signInWithPassword.mockReset();
    vi.unstubAllEnvs();
    mocks.signInWithOAuth.mockReset();
    window.history.replaceState(null, '', '/signup');
  });

  it('uses the documented Google flag and returns OAuth to signup', async () => {
    vi.stubEnv('VITE_AUTH_GOOGLE_ENABLED', 'true');
    mocks.signInWithOAuth.mockResolvedValue({ error: null });
    await registerMerchantWithProvider('google');
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${window.location.origin}/signup` } });
  });

  it('defaults Google on and respects an explicit disabled flag', () => {
    vi.unstubAllEnvs();
    expect(isMerchantProviderEnabled('google')).toBe(true);
    vi.stubEnv('VITE_AUTH_GOOGLE_ENABLED', 'false');
    expect(isMerchantProviderEnabled('google')).toBe(false);
  });

  it('surfaces provider failures and cancellation without exposing callback details', async () => {
    vi.stubEnv('VITE_AUTH_GOOGLE_ENABLED', 'true');
    mocks.signInWithOAuth.mockResolvedValue({ error: new Error('Provider unavailable') });
    await expect(registerMerchantWithProvider('google')).rejects.toThrow('Provider unavailable');
    window.history.replaceState(null, '', '/signup#error=access_denied&error_description=private');
    expect(merchantOAuthReturnError()).toContain('cancelled');
    expect(merchantOAuthReturnError()).not.toContain('private');
  });

  it('returns email confirmation to the customer-site signup route', async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { email: 'merchant@example.com' }, session: null }, error: null });

    await registerMerchantWithEmail(' Merchant@Example.com ', 'password123');

    expect(mocks.signUp).toHaveBeenCalledWith({
      email: 'merchant@example.com',
      password: 'password123',
      options: { emailRedirectTo: `${window.location.origin}/signup` },
    });
  });

  it('resumes onboarding by signing into the existing Auth account', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { email: 'merchant@example.com' }, session: {} }, error: null });

    await signInMerchantForOnboarding(' Merchant@Example.com ', 'password123');

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'merchant@example.com',
      password: 'password123',
    });
  });
});
