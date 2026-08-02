import { describe, expect, it } from 'vitest';
import { emptyOnboardingPayload } from '../../apps/merchant-onboarding/onboardingTypes';
import { normalizeWebsite, serializeDraft, validateStep } from '../../apps/merchant-onboarding/onboardingValidation';

describe('merchant onboarding validation', () => {
  it('normalizes websites', () => {
    expect(normalizeWebsite('bookglow.example/')).toBe('https://bookglow.example');
    expect(normalizeWebsite('')).toBe('');
  });

  it('limits categories and requires a selection', () => {
    const payload = emptyOnboardingPayload();
    expect(validateStep('categories', payload)).toMatch(/Select one/);
    payload.businessCategories = ['Massage', 'Spa', 'Beauty', 'Hair', 'Nails'];
    expect(validateStep('categories', payload)).toMatch(/no more than four/);
  });

  it('requires a physical address', () => {
    const payload = emptyOnboardingPayload();
    payload.serviceLocationType = 'physical';
    expect(validateStep('physical-location', payload)).toMatch(/address/);
    payload.location.addressDisplay = '12 Jalan Example, Kuala Lumpur';
    expect(validateStep('physical-location', payload)).toBeNull();
  });

  it('serializes drafts without mutable references', () => {
    const payload = emptyOnboardingPayload();
    const draft = serializeDraft(payload);
    draft.businessCategories.push('Massage');
    expect(payload.businessCategories).toEqual([]);
  });
});
