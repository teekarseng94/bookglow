import { describe, expect, it } from 'vitest';
import config from '../../capacitor.config';

describe('Android safe-area configuration', () => {
  it('keeps the WebView below enforced Android system bars', () => {
    expect(config.android?.adjustMarginsForEdgeToEdge).toBe('auto');
    expect(config.plugins?.StatusBar).toMatchObject({
      overlaysWebView: false,
      backgroundColor: '#ffffff',
    });
  });
});
