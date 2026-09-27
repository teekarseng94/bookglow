import { describe, expect, it } from 'vitest';
import {
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
