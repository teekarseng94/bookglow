import { beforeEach, describe, expect, it, vi } from 'vitest';

const signInWithOAuth = vi.hoisted(() => vi.fn());
vi.mock('@bookglow/supabase', () => ({ createBrowserSupabaseClient: () => ({ auth: { signInWithOAuth } }) }));

describe('merchant OAuth service', () => {
  beforeEach(() => { vi.resetModules(); vi.stubEnv('VITE_AUTH_GOOGLE_ENABLED', 'true'); signInWithOAuth.mockReset().mockResolvedValue({ error: null }); });
  it('uses Google and the merchant callback on the current origin', async () => {
    const { loginWithOAuth } = await import('./authService');
    await loginWithOAuth('google');
    expect(signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback/merchant` } });
  });
  it('does not offer a disabled provider', async () => {
    vi.stubEnv('VITE_AUTH_GOOGLE_ENABLED', 'false');
    const { loginWithOAuth } = await import('./authService');
    await expect(loginWithOAuth('google')).rejects.toThrow('currently unavailable');
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });
});
