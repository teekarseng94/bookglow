import { describe, expect, it } from 'vitest';
import {
  bookingSlugAfterRename,
  bookingSlugFollowsShopName,
  bookingSlugFromShopName,
  bookingSlugOutletSuffix,
  bookingSlugForEditor,
  isValidBookingSlug,
  resolveBookingSlug,
  shopNameToBookingSlug,
  slugifyBookingName,
  uniqueBookingSlug,
} from './bookingSlug';

describe('slugifyBookingName', () => {
  it('kebabs English names like onboarding SQL', () => {
    expect(slugifyBookingName('Restoran Desa Petaling')).toBe('restoran-desa-petaling');
  });

  it('strips CJK-only names to empty so callers can fall back', () => {
    expect(slugifyBookingName('白金卡')).toBe('');
  });
});

describe('uniqueBookingSlug', () => {
  const outletId = 'outlet_aaaaaaaaaaaaaaaaaaaaaaaaaa12ab34';

  it('uses business-<suffix> when the shop name has no ASCII letters', () => {
    expect(uniqueBookingSlug('白金卡', outletId)).toBe('business-12ab34');
    expect(isValidBookingSlug(uniqueBookingSlug('白金卡', outletId))).toBe(true);
  });

  it('keeps a kebab base plus the outlet suffix', () => {
    expect(uniqueBookingSlug('Harbour Spa', outletId)).toBe('harbour-spa-12ab34');
  });

  it('prefixes names that start with a digit', () => {
    expect(uniqueBookingSlug('123 Spa', outletId)).toBe('b-123-spa-12ab34');
  });
});

describe('resolveBookingSlug', () => {
  it('keeps a saved slug', () => {
    expect(resolveBookingSlug('harbourSpa', '白金卡', 'outlet_abc')).toBe('harbourSpa');
  });

  it('does not fall back to the raw outlet id when the slug is missing', () => {
    const outletId = 'outlet_bbbbbbbbbbbbbbbbbbbbbbbbbb99cdef';
    const slug = resolveBookingSlug('', '白金卡', outletId);
    expect(slug).toBe('business-99cdef');
    expect(slug).not.toContain('outlet_');
  });
});

describe('shopNameToBookingSlug', () => {
  it('still produces camelCase for English names', () => {
    expect(shopNameToBookingSlug('Harbour Spa')).toBe('harbourSpa');
  });
});

describe('bookingSlugForEditor', () => {
  it('hides the retired demo path', () => {
    expect(bookingSlugForEditor('baliWellness')).toBe('');
    expect(bookingSlugForEditor(' BALIWELLNESS ')).toBe('');
  });

  it('keeps a merchant-created path', () => {
    expect(bookingSlugForEditor('harbourSpa')).toBe('harbourSpa');
  });
});

describe('bookingSlugOutletSuffix', () => {
  it('uses the last six alphanumeric characters', () => {
    expect(bookingSlugOutletSuffix('outlet_abc123')).toBe('abc123');
  });
});

describe('bookingSlugFromShopName', () => {
  // These expectations are asserted against public.booking_slug_from_name in
  // Postgres too; the two must agree or a renamed outlet stops following.
  it('mirrors the shop name in camelCase', () => {
    expect(bookingSlugFromShopName('Harbour Spa')).toBe('harbourSpa');
    expect(bookingSlugFromShopName('Restoran Desa Petaling')).toBe('restoranDesaPetaling');
    expect(bookingSlugFromShopName('SOHOKAKI WELLNESS CENTER')).toBe('sohokakiWellnessCenter');
  });

  it('lowercases a single word and drops punctuation', () => {
    expect(bookingSlugFromShopName('  BOOKGLOW  ')).toBe('bookglow');
    expect(bookingSlugFromShopName('Zen-Flow  spa!')).toBe('zenflowSpa');
  });

  it('returns empty when the name cannot form a path', () => {
    expect(bookingSlugFromShopName('白金卡')).toBe('');
    expect(bookingSlugFromShopName('7 Spa')).toBe('');
    expect(bookingSlugFromShopName('   ')).toBe('');
  });
});

describe('bookingSlugAfterRename', () => {
  it('follows the new shop name when the path was auto-derived', () => {
    expect(bookingSlugAfterRename('harbourSpa', 'Harbour Spa', 'Harbour Wellness')).toBe('harbourWellness');
  });

  it('fills a blank path from the new shop name', () => {
    expect(bookingSlugAfterRename('', '白金卡', 'Restoran Desa Petaling')).toBe('restoranDesaPetaling');
  });

  it('leaves a custom path alone so shared links keep working', () => {
    expect(bookingSlugAfterRename('restorandesapetaling', '白金卡', 'Desa Petaling')).toBe('restorandesapetaling');
    expect(bookingSlugAfterRename('myOwnPath', 'Harbour Spa', 'Harbour Wellness')).toBe('myOwnPath');
  });

  it('keeps the existing path when the new name derives to nothing', () => {
    expect(bookingSlugAfterRename('harbourSpa', 'Harbour Spa', '白金卡')).toBe('harbourSpa');
    expect(bookingSlugAfterRename('harbourSpa', 'Harbour Spa', '')).toBe('harbourSpa');
  });

  it('tracks a name typed one character at a time', () => {
    // Each keystroke re-derives, so the path never falls behind the name.
    let slug = '';
    let name = '';
    for (const char of 'Spa Lux') {
      const next = name + char;
      slug = bookingSlugAfterRename(slug, name, next);
      name = next;
    }
    expect(slug).toBe('spaLux');
  });
});

describe('bookingSlugFollowsShopName', () => {
  it('is true while the path is what the name derives to', () => {
    expect(bookingSlugFollowsShopName('harbourSpa', 'Harbour Spa')).toBe(true);
    expect(bookingSlugFollowsShopName(' harbourSpa ', 'Harbour Spa')).toBe(true);
  });

  it('is false for a customised path, so a rename leaves it alone', () => {
    expect(bookingSlugFollowsShopName('restorandesapetaling', '白金卡')).toBe(false);
    expect(bookingSlugFollowsShopName('myOwnPath', 'Harbour Spa')).toBe(false);
  });

  it('is false when the name derives to nothing, so nothing is overwritten', () => {
    expect(bookingSlugFollowsShopName('', '白金卡')).toBe(false);
    expect(bookingSlugFollowsShopName('anything', '白金卡')).toBe(false);
  });
});
