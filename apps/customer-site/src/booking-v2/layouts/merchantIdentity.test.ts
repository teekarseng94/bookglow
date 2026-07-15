import { describe, it, expect } from 'vitest';
import { shouldShowOutletName } from './merchantIdentity';

describe('shouldShowOutletName', () => {
  it('hides the outlet name when it duplicates the merchant name', () => {
    expect(shouldShowOutletName('Bali Wellness', 'Bali Wellness')).toBe(false);
  });

  it('ignores case and surrounding whitespace when comparing', () => {
    expect(shouldShowOutletName('Bali Wellness', '  bali wellness ')).toBe(false);
  });

  it('shows the outlet name when it differs from the merchant name', () => {
    expect(shouldShowOutletName('Bali Wellness', 'Bali Wellness — Ubud')).toBe(true);
  });

  it('hides when outlet name is empty or nullish', () => {
    expect(shouldShowOutletName('Bali Wellness', '')).toBe(false);
    expect(shouldShowOutletName('Bali Wellness', null)).toBe(false);
    expect(shouldShowOutletName('Bali Wellness', undefined)).toBe(false);
  });
});
