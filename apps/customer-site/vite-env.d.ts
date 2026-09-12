/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_AUTH_GOOGLE_ENABLED?: string;
  readonly VITE_AUTH_FACEBOOK_ENABLED?: string;
  readonly VITE_DATA_PROVIDER?: string;
  readonly VITE_AUTH_PROVIDER?: string;
  readonly VITE_MERCHANT_PORTAL_URL?: string;
  readonly VITE_CUSTOMER_SITE_URL?: string;
  readonly VITE_CUSTOMER_AUTH_CALLBACK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
