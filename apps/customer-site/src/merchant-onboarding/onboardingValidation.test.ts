import { describe, expect, it } from 'vitest';
import { emptyOnboardingPayload } from '../../apps/merchant-onboarding/onboardingTypes';
import { canContinueOnboarding, isOnboardingStepOptional, normalizeWebsite, resumeOnboardingStep, serializeDraft, validateStep } from '../../apps/merchant-onboarding/onboardingValidation';

describe('merchant onboarding validation', () => {
  it('normalizes websites', () => {
    expect(normalizeWebsite('bookglow.example/')).toBe('https://bookglow.example');
    expect(normalizeWebsite('')).toBe('');
  });

  it('limits categories and requires a selection', () => {
    const payload = emptyOnboardingPayload();
    expect(validateStep('categories', payload)).toMatch(/Select one/);
    expect(canContinueOnboarding('categories', payload)).toBe(false);
    payload.businessCategories = ['Massage', 'Spa', 'Beauty', 'Hair', 'Nails'];
    expect(validateStep('categories', payload)).toMatch(/no more than four/);
    payload.businessCategories = ['Massage'];
    expect(canContinueOnboarding('categories', payload)).toBe(true);
  });

  it('requires a physical address', () => {
    const payload = emptyOnboardingPayload();
    payload.serviceLocationType = 'physical';
    expect(validateStep('physical-location', payload)).toMatch(/address/);
    expect(canContinueOnboarding('physical-location', payload)).toBe(false);
    payload.location.addressDisplay = '12 Jalan Example, Kuala Lumpur';
    expect(validateStep('physical-location', payload)).toBeNull();
    expect(canContinueOnboarding('physical-location', payload)).toBe(true);
  });

  it('keeps software optional unless Other is selected without a name', () => {
    const payload = emptyOnboardingPayload();
    expect(isOnboardingStepOptional('software')).toBe(true);
    expect(canContinueOnboarding('software', payload)).toBe(true);
    payload.previousSoftware = 'Acuity';
    expect(canContinueOnboarding('software', payload)).toBe(true);
    payload.previousSoftware = 'Other';
    expect(canContinueOnboarding('software', payload)).toBe(false);
    payload.previousSoftwareOther = 'Custom spa software';
    expect(canContinueOnboarding('software', payload)).toBe(true);
  });

  it('serializes drafts without mutable references', () => {
    const payload = emptyOnboardingPayload();
    const draft = serializeDraft(payload);
    draft.businessCategories.push('Massage');
    expect(payload.businessCategories).toEqual([]);
  });

  it('requires first name, a valid mobile number, and privacy consent', () => {
    const payload = emptyOnboardingPayload();
    expect(validateStep('personal-details', payload)).toMatch(/first name/i);
    payload.firstName = 'Desa';
    expect(validateStep('personal-details', payload)).toMatch(/valid mobile number/i);
    payload.phoneNational = '123829709';
    expect(validateStep('personal-details', payload)).toMatch(/Privacy Policy/i);
    payload.legalAccepted = true;
    expect(validateStep('personal-details', payload)).toBeNull();
  });

  it('resumes unfinished identity before business setup', () => {
    const unfinished = emptyOnboardingPayload();
    expect(resumeOnboardingStep('business-identity', unfinished)).toBe('personal-details');
    const finished = emptyOnboardingPayload();
    finished.firstName = 'Desa';
    finished.phoneNational = '123829709';
    finished.legalAccepted = true;
    finished.personalDetailsCompleted = true;
    expect(resumeOnboardingStep('categories', finished)).toBe('categories');
    expect(resumeOnboardingStep('personal-details', finished)).toBe('account-type');
  });
});
