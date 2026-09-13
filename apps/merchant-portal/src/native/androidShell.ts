import { Capacitor } from '@capacitor/core';

export const NATIVE_APP_ID = 'com.bookglow.merchant';
export const NATIVE_MERCHANT_OAUTH_REDIRECT = `${NATIVE_APP_ID}://auth/callback/merchant`;

function viteEnv(): Record<string, string | undefined> {
  return import.meta.env as unknown as Record<string, string | undefined>;
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Public HTTPS origin of the merchant web dashboard. Used when native origin is https://localhost. */
export function merchantPublicOrigin(): string {
  if (!isNativeApp() && typeof window !== 'undefined') {
    return window.location.origin;
  }
  const callback = viteEnv().VITE_MERCHANT_AUTH_CALLBACK_URL || '';
  try {
    if (callback) return new URL(callback).origin;
  } catch {
    /* fall through */
  }
  return 'https://bookglow-merchant-kar-sengs-projects.vercel.app';
}

/**
 * OAuth redirectTo for Supabase.
 * Native Android must use the custom scheme (allowlisted in Supabase Redirect URLs).
 * If the scheme is missing from the allowlist, Supabase falls back to Site URL
 * (bookglow.vercel.app marketing homepage) — that is the Android Google-login bug.
 */
export function merchantOAuthRedirectUrl(): string {
  if (isNativeApp()) return NATIVE_MERCHANT_OAUTH_REDIRECT;
  return viteEnv().VITE_MERCHANT_AUTH_CALLBACK_URL || `${window.location.origin}/auth/callback/merchant`;
}

function isInternalHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host === window.location.hostname) return true;
    return false;
  } catch {
    return false;
  }
}

export async function openExternalUrl(url: string): Promise<void> {
  if (!url) return;
  if (isNativeApp()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
    return;
  }
  window.location.assign(url);
}

function nativeCallbackHash(url: string): string | null {
  if (!url.startsWith(`${NATIVE_APP_ID}:`)) return null;
  try {
    const parsed = new URL(url);
    // com.bookglow.merchant://auth/callback/merchant?code=… → host=auth, path=/callback/merchant
    const path = `/${parsed.host}${parsed.pathname}`.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/auth/callback/merchant';
    const search = parsed.search || '';
    if (!path.includes('/auth/callback/merchant')) return null;
    return `/#${path}${search}`;
  } catch {
    return null;
  }
}

export async function initAndroidShell(): Promise<void> {
  if (!isNativeApp()) return;

  const [{ App }, { SplashScreen }, { StatusBar, Style }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/splash-screen'),
    import('@capacitor/status-bar'),
  ]);

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: '#ffffff' });
    await StatusBar.setStyle({ style: Style.Light });
  } catch {
    /* Status bar is optional on some devices. */
  }

  await App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack || window.history.length > 1) {
      window.history.back();
      return;
    }
    void App.exitApp();
  });

  await App.addListener('appUrlOpen', ({ url }) => {
    const hash = nativeCallbackHash(url);
    if (hash) {
      void import('@capacitor/browser').then(({ Browser }) => Browser.close()).catch(() => undefined);
      window.location.replace(hash);
    }
  });

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('/')) return;
      if (/^(mailto:|tel:|sms:|whatsapp:|geo:)/i.test(href)) {
        event.preventDefault();
        void openExternalUrl(href);
        return;
      }
      if (/^https?:/i.test(href) && (anchor.target === '_blank' || !isInternalHttpUrl(href))) {
        event.preventDefault();
        void openExternalUrl(href);
      }
    },
    true,
  );

  try {
    await SplashScreen.hide();
  } catch {
    /* Splash plugin may already auto-hide. */
  }
}
