import { defineConfig } from '@playwright/test';
import { localConfig } from '../../migration/validate/superadmin-phase1-local.mjs';
const local = localConfig();
export default defineConfig({
  testDir: './test/visual', testMatch: 'superadmin-phase1.local.spec.mjs',
  workers: 1, retries: 0, timeout: 120000, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5187', channel: 'msedge', actionTimeout: 15000, navigationTimeout: 30000, locale: 'en-MY', timezoneId: 'Asia/Kuala_Lumpur', screenshot: 'only-on-failure', storageState: {cookies:[],origins:[]} },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5187 --strictPort',
    url: 'http://127.0.0.1:5187', reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: local.API_URL, VITE_SUPABASE_PUBLISHABLE_KEY: local.ANON_KEY, VITE_SUPABASE_ANON_KEY: local.ANON_KEY,
      VITE_CUSTOMER_SITE_URL:'http://127.0.0.1:5174', VITE_MERCHANT_AUTH_CALLBACK_URL:'http://127.0.0.1:5187/auth/callback/merchant', VITE_SOCKET_URL:'', GEMINI_API_KEY:'' },
  },
});
