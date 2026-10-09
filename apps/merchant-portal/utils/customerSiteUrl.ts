/** Canonical public booking origin. Never Firebase Hosting. */
export const PRODUCTION_CUSTOMER_ORIGIN = 'https://bookglow.my';

type CustomerSiteEnv = {
  VITE_CUSTOMER_SITE_URL?: string;
  DEV?: boolean;
};

function isRetiredFirebaseHost(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host.endsWith('.web.app') || host.endsWith('.firebaseapp.com');
  } catch {
    return true;
  }
}

/** Public customer-site origin for booking links and legacy redirects. */
export function resolveCustomerSiteOrigin(env: CustomerSiteEnv): string {
  const configured = (env.VITE_CUSTOMER_SITE_URL || '').trim().replace(/\/+$/, '');
  if (configured && !isRetiredFirebaseHost(configured)) return configured;
  if (env.DEV) return 'http://localhost:5174';
  return PRODUCTION_CUSTOMER_ORIGIN;
}

export function customerSiteOrigin(): string {
  return resolveCustomerSiteOrigin(import.meta.env as unknown as CustomerSiteEnv);
}
