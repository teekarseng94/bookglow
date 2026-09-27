import { describe, expect, it } from 'vitest';
import { BOOKGLOW_BUILD } from './buildInfo';

describe('BOOKGLOW_BUILD', () => {
  it('exposes a density-v3 fingerprint', () => {
    expect(BOOKGLOW_BUILD.name).toBe('BookGlow frontend');
    expect(BOOKGLOW_BUILD.density).toBe('v4');
    expect(BOOKGLOW_BUILD.commit).toBeTruthy();
    expect(BOOKGLOW_BUILD.built).toBeTruthy();
  });
});
