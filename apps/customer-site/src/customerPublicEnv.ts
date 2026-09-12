/**
 * Browser-public config for the customer site.
 * Prefer Vite env when present; fall back to production defaults so Vercel
 * builds still work if dashboard/vercel.json env injection is missing.
 * Never put service_role / Google client secrets here.
 */

function read(name: keyof ImportMetaEnv, fallback: string): string {
  const value = (import.meta.env[name] as string | undefined)?.trim();
  return value || fallback;
}

export function customerBrowserEnv(): Record<string, string | undefined> {
  return {
    ...(import.meta.env as unknown as Record<string, string | undefined>),
    VITE_SUPABASE_URL: read('VITE_SUPABASE_URL', 'https://uecphpjymbgtttrizhgy.supabase.co'),
    VITE_SUPABASE_PUBLISHABLE_KEY: read(
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      'sb_publishable_B6tTdRL9dDtvWZdZ18ScrA_9FnZ-T6b',
    ),
    VITE_AUTH_GOOGLE_ENABLED: read('VITE_AUTH_GOOGLE_ENABLED', 'true'),
    VITE_AUTH_FACEBOOK_ENABLED: read('VITE_AUTH_FACEBOOK_ENABLED', 'false'),
    VITE_DATA_PROVIDER: read('VITE_DATA_PROVIDER', 'supabase'),
    VITE_AUTH_PROVIDER: read('VITE_AUTH_PROVIDER', 'supabase'),
    VITE_CUSTOMER_SITE_URL: read('VITE_CUSTOMER_SITE_URL', 'https://bookglow.vercel.app'),
    VITE_CUSTOMER_AUTH_CALLBACK_URL: read(
      'VITE_CUSTOMER_AUTH_CALLBACK_URL',
      'https://bookglow.vercel.app/auth/callback/customer',
    ),
    VITE_MERCHANT_PORTAL_URL: read(
      'VITE_MERCHANT_PORTAL_URL',
      'https://bookglow-merchant-kar-sengs-projects.vercel.app',
    ),
  };
}

export const customerPublicEnv = {
  get VITE_SUPABASE_URL() {
    return customerBrowserEnv().VITE_SUPABASE_URL!;
  },
  get VITE_SUPABASE_PUBLISHABLE_KEY() {
    return customerBrowserEnv().VITE_SUPABASE_PUBLISHABLE_KEY!;
  },
  get VITE_AUTH_GOOGLE_ENABLED() {
    return customerBrowserEnv().VITE_AUTH_GOOGLE_ENABLED!;
  },
  get VITE_AUTH_FACEBOOK_ENABLED() {
    return customerBrowserEnv().VITE_AUTH_FACEBOOK_ENABLED!;
  },
  get VITE_MERCHANT_PORTAL_URL() {
    return customerBrowserEnv().VITE_MERCHANT_PORTAL_URL!;
  },
};
