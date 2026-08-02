export type AccountType = 'create' | 'join';
export type ServiceLocationType = 'physical' | 'mobile' | 'virtual';
export type TeamSize = 'independent' | '2-5' | '6-10' | '11-20' | '20-plus';

export interface MerchantLocation {
  addressDisplay: string;
  structuredAddress?: Record<string, string>;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  country: string;
  timezone: string;
}

export interface MerchantOnboardingPayload {
  accountType?: AccountType;
  invitationCode?: string;
  businessName: string;
  website: string;
  businessCategories: string[];
  primaryBusinessCategory: string;
  serviceLocationType?: ServiceLocationType;
  location: MerchantLocation;
  teamSize?: TeamSize;
  previousSoftware: string;
  previousSoftwareOther: string;
}

export type OnboardingStepId =
  | 'account-type' | 'business-identity' | 'categories' | 'service-location'
  | 'physical-location' | 'team-size' | 'software' | 'complete';

export interface OnboardingDraft {
  currentStep: OnboardingStepId;
  accountType?: AccountType;
  payload: MerchantOnboardingPayload;
  completedAt?: string | null;
}

export const emptyOnboardingPayload = (): MerchantOnboardingPayload => ({
  businessName: '', website: '', businessCategories: [], primaryBusinessCategory: '',
  location: {
    addressDisplay: '', country: 'Malaysia',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kuala_Lumpur',
  },
  previousSoftware: '', previousSoftwareOther: '',
});
