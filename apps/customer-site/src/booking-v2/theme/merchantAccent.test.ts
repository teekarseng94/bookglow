import { describe, it, expect } from 'vitest';
import {
  resolveMerchantAccent,
  contrastRatio,
  parseHexColor,
  pickAccessibleForeground,
  DEFAULT_MERCHANT_ACCENT,
  DARK_TEXT,
  LIGHT_TEXT,
  WCAG_AA_NORMAL,
} from './merchantAccent';

function ratioAgainst(accentHex: string, textHex: string): number {
  return contrastRatio(parseHexColor(accentHex)!, parseHexColor(textHex)!);
}

describe('resolveMerchantAccent', () => {
  it('chooses dark text for a very light accent (and it passes AA)', () => {
    const r = resolveMerchantAccent('#ffff00'); // bright yellow
    expect(r.isDefault).toBe(false);
    expect(r.contrast).toBe(DARK_TEXT);
    expect(ratioAgainst(r.accent, r.contrast)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it('chooses light text for a very dark accent (and it passes AA)', () => {
    const r = resolveMerchantAccent('#000080'); // navy
    expect(r.isDefault).toBe(false);
    expect(r.contrast).toBe(LIGHT_TEXT);
    expect(ratioAgainst(r.accent, r.contrast)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it('falls back to the governed default for a mid-tone with no accessible foreground', () => {
    // ~#797979: neither white nor dark text reaches 4.5:1.
    const accent = '#797979';
    expect(pickAccessibleForeground(parseHexColor(accent)!)).toBeNull();
    const r = resolveMerchantAccent(accent);
    expect(r).toEqual(DEFAULT_MERCHANT_ACCENT);
    expect(r.isDefault).toBe(true);
  });

  it('falls back to the governed default for invalid colour input', () => {
    expect(resolveMerchantAccent('not-a-color').isDefault).toBe(true);
    expect(resolveMerchantAccent('#12345').isDefault).toBe(true); // wrong length
    expect(resolveMerchantAccent('').isDefault).toBe(true);
    expect(resolveMerchantAccent(null).isDefault).toBe(true);
  });

  it('accepts shorthand hex and produces distinct hover/active shades', () => {
    const r = resolveMerchantAccent('#2f5d50');
    expect(r.isDefault).toBe(false);
    expect(r.hover).not.toBe(r.accent);
    expect(r.active).not.toBe(r.accent);
    expect(r.hover).not.toBe(r.active);
  });

  it('does not expose any semantic colour tokens (accent only)', () => {
    const r = resolveMerchantAccent('#3355ff');
    expect(Object.keys(r).sort()).toEqual(
      ['accent', 'active', 'contrast', 'hover', 'isDefault'].sort(),
    );
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black vs white', () => {
    expect(ratioAgainst('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
  it('is 1:1 for identical colours', () => {
    expect(ratioAgainst('#123456', '#123456')).toBeCloseTo(1, 5);
  });
});

/** Sum of channels — a simple lightness proxy for direction assertions. */
function channelSum(hex: string): number {
  const c = parseHexColor(hex)!;
  return c.r + c.g + c.b;
}

describe('resolveMerchantAccent hover/active shade direction', () => {
  it('darkens hover/active for a dark accent (white foreground)', () => {
    const r = resolveMerchantAccent('#0a2540'); // dark navy
    expect(r.isDefault).toBe(false);
    expect(r.contrast).toBe(LIGHT_TEXT);
    expect(channelSum(r.hover)).toBeLessThan(channelSum(r.accent));
    expect(channelSum(r.active)).toBeLessThan(channelSum(r.hover));
  });

  it('lightens hover/active for a light accent (dark foreground)', () => {
    const r = resolveMerchantAccent('#ffd54a'); // light amber
    expect(r.isDefault).toBe(false);
    expect(r.contrast).toBe(DARK_TEXT);
    expect(channelSum(r.hover)).toBeGreaterThan(channelSum(r.accent));
    expect(channelSum(r.active)).toBeGreaterThan(channelSum(r.hover));
  });

  it('base, hover AND active all meet the WCAG AA threshold', () => {
    for (const input of ['#0a2540', '#ffd54a', '#2f5d50', '#3355ff']) {
      const r = resolveMerchantAccent(input);
      if (r.isDefault) continue; // default is verified separately
      expect(ratioAgainst(r.accent, r.contrast)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      expect(ratioAgainst(r.hover, r.contrast)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      expect(ratioAgainst(r.active, r.contrast)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    }
  });

  it('the governed default accent itself meets AA on all states', () => {
    const d = DEFAULT_MERCHANT_ACCENT;
    expect(ratioAgainst(d.accent, d.contrast)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    expect(ratioAgainst(d.hover, d.contrast)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    expect(ratioAgainst(d.active, d.contrast)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it('falls back to the default (incl. hover/active) when no state is accessible', () => {
    const r = resolveMerchantAccent('#797979');
    expect(r).toEqual(DEFAULT_MERCHANT_ACCENT);
    expect(r.hover).toBe(DEFAULT_MERCHANT_ACCENT.hover);
    expect(r.active).toBe(DEFAULT_MERCHANT_ACCENT.active);
  });
});
