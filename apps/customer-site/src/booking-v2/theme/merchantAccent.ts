/**
 * Merchant accent resolution (accessibility-aware).
 *
 * Given a merchant's public accent colour, produce a governed set of accent
 * CSS-variable values:
 *  - a validated base accent,
 *  - derived hover / active shades (NOT identical to the base),
 *  - a foreground (contrast) colour chosen by real WCAG contrast ratio.
 *
 * If the input is invalid, or no foreground colour reaches the WCAG AA
 * threshold for normal text, we fall back to the governed Bookglow default
 * accent. Merchant accents only ever affect `--merchant-accent*`; they never
 * override semantic success / warning / danger tokens.
 */

/** Dark text token (matches --text-primary). */
export const DARK_TEXT = '#14181f';
/** Light text token. */
export const LIGHT_TEXT = '#ffffff';
/** WCAG 2.1 AA contrast ratio for normal-size text. */
export const WCAG_AA_NORMAL = 4.5;

export interface ResolvedAccent {
  accent: string;
  hover: string;
  active: string;
  contrast: string;
  /** True when the governed default was used (invalid or inaccessible input). */
  isDefault: boolean;
}

/** Governed Bookglow default accent (mirrors tokens.css). */
export const DEFAULT_MERCHANT_ACCENT: ResolvedAccent = {
  accent: '#2f5d50',
  hover: '#274d43',
  active: '#1f3e36',
  contrast: LIGHT_TEXT,
  isDefault: true,
};

interface RGB {
  r: number;
  g: number;
  b: number;
}

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function parseHexColor(input: unknown): RGB | null {
  if (typeof input !== 'string') return null;
  const m = HEX_RE.exec(input.trim());
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return { r, g, b };
}

function toHex({ r, g, b }: RGB): string {
  const h = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** sRGB relative luminance per WCAG. */
function relativeLuminance({ r, g, b }: RGB): number {
  const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two colours (1..21). */
export function contrastRatio(a: RGB, b: RGB): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/** Move channels toward black by `factor` (0..1) to produce a darker shade. */
function darken(rgb: RGB, factor: number): RGB {
  return { r: rgb.r * (1 - factor), g: rgb.g * (1 - factor), b: rgb.b * (1 - factor) };
}

/** Move channels toward white by `factor` (0..1) to produce a lighter shade. */
function lighten(rgb: RGB, factor: number): RGB {
  return {
    r: rgb.r + (255 - rgb.r) * factor,
    g: rgb.g + (255 - rgb.g) * factor,
    b: rgb.b + (255 - rgb.b) * factor,
  };
}

/**
 * Pick the foreground (dark vs light) with the greater contrast against the
 * accent. Returns null when neither reaches the AA threshold.
 */
export function pickAccessibleForeground(accent: RGB): string | null {
  const dark = parseHexColor(DARK_TEXT)!;
  const light = parseHexColor(LIGHT_TEXT)!;
  const darkRatio = contrastRatio(accent, dark);
  const lightRatio = contrastRatio(accent, light);
  const best = Math.max(darkRatio, lightRatio);
  if (best < WCAG_AA_NORMAL) return null;
  return darkRatio >= lightRatio ? DARK_TEXT : LIGHT_TEXT;
}

/**
 * Resolve a merchant accent into governed CSS-variable values, or the Bookglow
 * default when the input is invalid or not accessible.
 */
export function resolveMerchantAccent(input: string | null | undefined): ResolvedAccent {
  const rgb = parseHexColor(input ?? null);
  if (!rgb) return DEFAULT_MERCHANT_ACCENT;

  const contrast = pickAccessibleForeground(rgb);
  if (!contrast) return DEFAULT_MERCHANT_ACCENT;

  // Shade direction preserves contrast against the chosen foreground:
  //  - white foreground (accent is dark)  -> darken hover/active,
  //  - dark foreground (accent is light)  -> lighten hover/active.
  const usesLightForeground = contrast === LIGHT_TEXT;
  const hover = usesLightForeground ? darken(rgb, 0.12) : lighten(rgb, 0.12);
  const active = usesLightForeground ? darken(rgb, 0.22) : lighten(rgb, 0.22);

  // Verify base, hover AND active all meet the AA threshold; if any state
  // fails, fall back to the governed default accent.
  const fg = parseHexColor(contrast)!;
  const passes = (shade: RGB) => contrastRatio(shade, fg) >= WCAG_AA_NORMAL;
  if (!passes(rgb) || !passes(hover) || !passes(active)) {
    return DEFAULT_MERCHANT_ACCENT;
  }

  return {
    accent: toHex(rgb),
    hover: toHex(hover),
    active: toHex(active),
    contrast,
    isDefault: false,
  };
}
