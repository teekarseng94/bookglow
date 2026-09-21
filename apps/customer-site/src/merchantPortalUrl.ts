import { customerPublicEnv } from './customerPublicEnv';

const PRODUCTION_ORIGIN = 'https://bookglow.my';

export function merchantPortalOrigin(): string {
  return customerPublicEnv.VITE_MERCHANT_PORTAL_URL.trim().replace(/\/+$/, '') || PRODUCTION_ORIGIN;
}

function currentOrigin(): string | null {
  if (typeof window === 'undefined') return null;
  return window.location.origin;
}

/** Same-origin path when already on bookglow.my; otherwise the configured portal origin (local :5173). */
export function merchantLoginHref(query?: Record<string, string>): string {
  const portal = merchantPortalOrigin();
  const here = currentOrigin();
  const sameOrigin = Boolean(here && portal === here);
  const url = new URL('/login', sameOrigin ? here! : portal);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  if (sameOrigin) return `${url.pathname}${url.search}`;
  return url.toString();
}

export function merchantLoginIsCrossOrigin(): boolean {
  const here = currentOrigin();
  if (!here) return false;
  return merchantPortalOrigin() !== here;
}
