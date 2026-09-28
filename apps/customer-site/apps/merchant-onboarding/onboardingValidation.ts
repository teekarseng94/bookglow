import type { MerchantOnboardingPayload, OnboardingStepId } from './onboardingTypes';
import { composeFullName, phoneValidationMessage } from './personalDetails';

export function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try { return new URL(withProtocol).toString().replace(/\/$/, ''); }
  catch { throw new Error('Enter a valid website address.'); }
}

export function validateStep(step: OnboardingStepId, payload: MerchantOnboardingPayload): string | null {
  if (step === 'personal-details') {
    if (payload.firstName.trim().length < 1) return 'Enter your first name.';
    const phoneError = phoneValidationMessage(payload.phoneNational);
    if (phoneError) return phoneError;
    if (!payload.legalAccepted) return 'Please agree to the Privacy Policy to continue.';
    if (!composeFullName(payload.firstName, payload.lastName)) return 'Enter your first name.';
  }
  if (step === 'account-type' && !payload.accountType) return 'Choose how you want to set up your account.';
  if (step === 'account-type' && payload.accountType === 'join' && !payload.invitationCode?.trim()) return 'Enter your invitation code.';
  if (step === 'business-identity') {
    const length = payload.businessName.trim().length;
    if (length < 2 || length > 80) return 'Business name must be between 2 and 80 characters.';
    try { normalizeWebsite(payload.website); } catch (error) { return (error as Error).message; }
  }
  if (step === 'categories' && (payload.businessCategories.length < 1 || payload.businessCategories.length > 4)) return 'Select one primary category and no more than four categories total.';
  if (step === 'service-location' && !payload.serviceLocationType) return 'Choose where you provide services.';
  if (step === 'physical-location' && payload.location.addressDisplay.trim().length < 4) return 'Enter your full business address.';
  if (step === 'team-size' && !payload.teamSize) return 'Choose your team size.';
  if (step === 'software' && payload.previousSoftware === 'Other' && !payload.previousSoftwareOther.trim()) return 'Enter the software name.';
  return null;
}

export function isOnboardingStepOptional(step: OnboardingStepId): boolean {
  return step === 'software';
}

export function canContinueOnboarding(step: OnboardingStepId, payload: MerchantOnboardingPayload): boolean {
  return validateStep(step, payload) === null;
}

export function serializeDraft(payload: MerchantOnboardingPayload): MerchantOnboardingPayload {
  return JSON.parse(JSON.stringify(payload)) as MerchantOnboardingPayload;
}

export function isPersonalDetailsComplete(payload: MerchantOnboardingPayload): boolean {
  return Boolean(payload.personalDetailsCompleted) && validateStep('personal-details', payload) === null;
}

/** Resume rule: unfinished identity always comes before business setup. */
export function resumeOnboardingStep(
  savedStep: OnboardingStepId | undefined,
  payload: MerchantOnboardingPayload,
): OnboardingStepId {
  if (!isPersonalDetailsComplete(payload)) return 'personal-details';
  if (!savedStep || savedStep === 'personal-details') return 'account-type';
  return savedStep;
}
