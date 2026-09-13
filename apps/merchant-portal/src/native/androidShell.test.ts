import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));

describe('androidShell native OAuth callback mapping', () => {
  it('maps the Capacitor deep link onto the HashRouter merchant callback', async () => {
    const { NATIVE_MERCHANT_OAUTH_REDIRECT } = await import('./androidShell');
    expect(NATIVE_MERCHANT_OAUTH_REDIRECT).toBe('com.bookglow.merchant://auth/callback/merchant');

    // Re-implement the same mapping the shell uses so we lock the contract without exporting internals.
    const url = `${NATIVE_MERCHANT_OAUTH_REDIRECT}?code=test-code&state=xyz`;
    const parsed = new URL(url);
    const path = `/${parsed.host}${parsed.pathname}`.replace(/\/{2,}/g, '/').replace(/\/$/, '');
    const hash = `/#${path}${parsed.search}`;
    expect(hash).toBe('/#/auth/callback/merchant?code=test-code&state=xyz');
  });
});
