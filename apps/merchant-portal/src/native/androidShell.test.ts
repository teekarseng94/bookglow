import { describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const nativeApp = vi.hoisted(() => ({
  addListener: vi.fn(async () => ({ remove: vi.fn() })),
  exitApp: vi.fn(),
  getLaunchUrl: vi.fn(async () => undefined),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));

vi.mock('@capacitor/app', () => ({ App: nativeApp }));
vi.mock('@capacitor/browser', () => ({ Browser: { close: vi.fn(), open: vi.fn() } }));
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: { hide: vi.fn() } }));
vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setOverlaysWebView: vi.fn(),
    setBackgroundColor: vi.fn(),
    setStyle: vi.fn(),
  },
  Style: { Light: 'LIGHT' },
}));

describe('androidShell native OAuth callback mapping', () => {
  it('initializes the native shell from the production entry point', async () => {
    const entry = await readFile(path.resolve(process.cwd(), 'entry.js'), 'utf8');

    expect(entry).toContain("import('./src/native/androidShell')");
    expect(entry).toContain('shell.initAndroidShell()');
  });

  it('maps the Capacitor deep link onto the BrowserRouter merchant callback', async () => {
    const { NATIVE_MERCHANT_OAUTH_REDIRECT, nativeCallbackRoute } = await import('./androidShell');
    expect(NATIVE_MERCHANT_OAUTH_REDIRECT).toBe('com.bookglow.merchant://auth/callback/merchant');

    const url = `${NATIVE_MERCHANT_OAUTH_REDIRECT}?code=test-code&state=xyz`;
    expect(nativeCallbackRoute(url)).toBe('/auth/callback/merchant?code=test-code&state=xyz');
  });

  it('checks the Android cold-start launch URL after registering the listener', async () => {
    const { initAndroidShell } = await import('./androidShell');

    await initAndroidShell();

    expect(nativeApp.addListener).toHaveBeenCalledWith('appUrlOpen', expect.any(Function));
    expect(nativeApp.getLaunchUrl).toHaveBeenCalledOnce();
    expect(nativeApp.addListener.mock.invocationCallOrder[0]).toBeLessThan(
      nativeApp.getLaunchUrl.mock.invocationCallOrder[0],
    );
  });
});
