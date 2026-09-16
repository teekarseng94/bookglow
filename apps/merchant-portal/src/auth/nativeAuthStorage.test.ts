import { describe, expect, it } from 'vitest';
import { oauthCodeFromValue, createNativeAuthStorage } from './nativeAuthStorage';

describe('oauthCodeFromValue', () => {
  it('reads a PKCE code from a native deep link', () => {
    expect(oauthCodeFromValue('com.bookglow.merchant://auth/callback/merchant?code=abc&state=1')).toBe('abc');
  });

  it('reads a PKCE code from a query string', () => {
    expect(oauthCodeFromValue('?code=xyz')).toBe('xyz');
  });

  it('reads a PKCE code from a Capacitor hash callback', () => {
    expect(oauthCodeFromValue('https://localhost/auth/callback/merchant#?code=hash-code&state=1')).toBe('hash-code');
  });
});

describe('createNativeAuthStorage', () => {
  it('reads auth keys synchronously from localStorage', () => {
    window.localStorage.setItem('sb-test-token', '{"access_token":"x"}');
    expect(createNativeAuthStorage().getItem('sb-test-token')).toBe('{"access_token":"x"}');
  });

  it('returns null immediately when a key is missing', () => {
    expect(createNativeAuthStorage().getItem('missing-key')).toBeNull();
  });

  it('writes auth keys synchronously without waiting on Preferences', () => {
    expect(createNativeAuthStorage().setItem('sb-test-write', '1')).toBeUndefined();
    expect(window.localStorage.getItem('sb-test-write')).toBe('1');
  });
});
