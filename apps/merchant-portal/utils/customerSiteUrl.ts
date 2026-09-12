/** Public customer-site origin for booking links and legacy redirects. Never fall back to Firebase Hosting. */
export function customerSiteOrigin(): string {
  const configured = (import.meta.env.VITE_CUSTOMER_SITE_URL as string | undefined)
    ?.trim()
    .replace(/\/+$/, '');
  if (configured) return configured;
  if (import.meta.env.DEV) return 'http://localhost:5174';
  return '';
}
