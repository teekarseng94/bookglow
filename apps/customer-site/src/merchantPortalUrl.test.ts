import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./customerPublicEnv', () => ({
  customerPublicEnv: {
    VITE_MERCHANT_PORTAL_URL: 'https://bookglow.my',
  },
}));

import { merchantLoginHref, merchantLoginIsCrossOrigin, merchantPortalOrigin } from './merchantPortalUrl';

describe('merchantPortalUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses a same-origin /login path on bookglow.my', () => {
    vi.stubGlobal('window', { location: { origin: 'https://bookglow.my' } });
    expect(merchantPortalOrigin()).toBe('https://bookglow.my');
    expect(merchantLoginHref()).toBe('/login');
    expect(merchantLoginHref({ email: 'a@b.c', onboarding: 'complete' })).toBe(
      '/login?email=a%40b.c&onboarding=complete',
    );
    expect(merchantLoginIsCrossOrigin()).toBe(false);
  });

  it('keeps an absolute portal URL on local customer-site', () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:5174' } });
    expect(merchantLoginHref()).toBe('https://bookglow.my/login');
    expect(merchantLoginIsCrossOrigin()).toBe(true);
  });
});
