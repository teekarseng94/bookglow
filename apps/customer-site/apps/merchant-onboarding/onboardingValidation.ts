import type { MerchantOnboardingPayload, OnboardingStepId } from './onboardingTypes';

export function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try { return new URL(withProtocol).toString().replace(/\/$/, ''); }
  catch { throw new Error('Enter a valid website address.'); }
}

export function validateStep(step: OnboardingStepId, payload: MerchantOnboardingPayload): string | null {
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

export function serializeDraft(payload: MerchantOnboardingPayload): MerchantOnboardingPayload {
  return JSON.parse(JSON.stringify(payload)) as MerchantOnboardingPayload;
}
