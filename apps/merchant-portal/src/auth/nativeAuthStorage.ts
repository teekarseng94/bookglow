import { Capacitor } from '@capacitor/core';

/**
 * Auth storage that survives Android process death during Google Custom Tabs.
 * Reads are always synchronous (memory + localStorage) so supabase-js initialize()
 * cannot hang the AppBootstrap "Initializing…" screen. Preferences is a write-behind
 * backup, hydrated once at native startup with a hard timeout.
 */
export const NATIVE_OAUTH_CALLBACK_KEY = 'bookglow.merchant.oauth_callback';

const memory = new Map<string, string>();
const PREFS_TIMEOUT_MS = 400;

function withTimeout<T>(promise: Promise<T>, fallback: T, ms = PREFS_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      () => {
        window.clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

async function preferences() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    return Preferences;
  } catch {
    return null;
  }
}

function readLocal(key: string): string | null {
  if (memory.has(key)) return memory.get(key) || null;
  try {
    const local = window.localStorage.getItem(key);
    if (local != null) memory.set(key, local);
    return local;
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* WebView storage can be unavailable during a cold start. */
  }
}

function removeLocal(key: string) {
  memory.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Run the auth critical section immediately. Queuing behind navigator.locks deadlocks Android WebView. */
export async function runNativeAuthLock<T>(_name: string, _acquireTimeout: number, fn: () => Promise<T>): Promise<T> {
  return fn();
}

function writePreference(key: string, value: string) {
  void preferences()
    .then((prefs) => (prefs ? prefs.set({ key, value }) : undefined))
    .catch(() => undefined);
}

function removePreference(key: string) {
  void preferences()
    .then((prefs) => (prefs ? prefs.remove({ key }) : undefined))
    .catch(() => undefined);
}

export function createNativeAuthStorage() {
  return {
    getItem: (key: string): string | null => readLocal(key),
    setItem: (key: string, value: string): void => {
      writeLocal(key, value);
      writePreference(key, value);
    },
    removeItem: (key: string): void => {
      removeLocal(key);
      removePreference(key);
    },
  };
}

export async function hydrateNativeAuthStorage(): Promise<void> {
  const prefs = await withTimeout(preferences(), null);
  if (!prefs) return;
  const listed = await withTimeout(prefs.keys(), { keys: [] as string[] });
  await Promise.all(
    (listed.keys || []).map(async (key) => {
      if (readLocal(key) != null) return;
      const stored = await withTimeout(prefs.get({ key }), { value: null as string | null });
      if (stored.value) writeLocal(key, stored.value);
    }),
  );
}

export async function persistNativeOAuthCallback(url: string): Promise<void> {
  writeLocal(NATIVE_OAUTH_CALLBACK_KEY, url);
  writePreference(NATIVE_OAUTH_CALLBACK_KEY, url);
}

export async function readNativeOAuthCallback(): Promise<string | null> {
  const local = readLocal(NATIVE_OAUTH_CALLBACK_KEY);
  if (local) return local;
  const prefs = await withTimeout(preferences(), null);
  if (!prefs) return null;
  const stored = await withTimeout(prefs.get({ key: NATIVE_OAUTH_CALLBACK_KEY }), { value: null as string | null });
  return stored.value ?? null;
}

export async function clearNativeOAuthCallback(): Promise<void> {
  removeLocal(NATIVE_OAUTH_CALLBACK_KEY);
  removePreference(NATIVE_OAUTH_CALLBACK_KEY);
}

function codeFromQuery(query: string): string | null {
  return new URLSearchParams(query.replace(/^[?#]/, '')).get('code');
}

export function oauthCodeFromValue(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.searchParams.get('code') || codeFromQuery(parsed.hash.replace(/^#/, ''));
  } catch {
    const query = value.includes('?') ? value.slice(value.indexOf('?') + 1) : value.replace(/^#/, '');
    return codeFromQuery(query);
  }
}
