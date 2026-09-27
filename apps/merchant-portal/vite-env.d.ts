/// <reference types="vite/client" />

declare const __BOOKGLOW_BUILD__: {
  name: string;
  commit: string;
  built: string;
  density: string;
};

interface ImportMetaEnv {
  readonly VITE_SOCKET_URL?: string;
  readonly VITE_CUSTOMER_SITE_URL?: string;
  readonly VITE_MERCHANT_PORTAL_URL?: string;
  readonly VITE_MERCHANT_AUTH_CALLBACK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
