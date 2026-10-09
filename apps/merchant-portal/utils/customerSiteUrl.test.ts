import { describe, expect, it } from 'vitest';
import { PRODUCTION_CUSTOMER_ORIGIN, resolveCustomerSiteOrigin } from './customerSiteUrl';

describe('resolveCustomerSiteOrigin', () => {
  it('uses the configured origin when it is not Firebase Hosting', () => {
    expect(
      resolveCustomerSiteOrigin({ VITE_CUSTOMER_SITE_URL: 'https://bookglow.my/' }),
    ).toBe('https://bookglow.my');
  });

  it('rejects retired Firebase booking hosts so Copy link uses bookglow.my', () => {
    expect(
      resolveCustomerSiteOrigin({
        VITE_CUSTOMER_SITE_URL: 'https://bookglow-83fb3.web.app',
      }),
    ).toBe(PRODUCTION_CUSTOMER_ORIGIN);
    expect(
      resolveCustomerSiteOrigin({
        VITE_CUSTOMER_SITE_URL: 'https://bookglow-83fb3.firebaseapp.com/book',
        DEV: false,
      }),
    ).toBe(PRODUCTION_CUSTOMER_ORIGIN);
  });

  it('falls back to the local customer site in development', () => {
    expect(resolveCustomerSiteOrigin({ DEV: true })).toBe('http://localhost:5174');
  });
});
