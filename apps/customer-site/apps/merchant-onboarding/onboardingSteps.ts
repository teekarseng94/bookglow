import type { OnboardingStepId } from './onboardingTypes';

export const BUSINESS_CATEGORIES = [
  'Massage', 'Spa and wellness', 'Beauty salon', 'Hair salon', 'Nails',
  'Eyebrows and lashes', 'Facial and skincare', 'Barbershop', 'Fitness', 'Therapy', 'Other',
] as const;

export const TEAM_SIZES = [
  ['independent', "I'm an independent"], ['2-5', '2–5 people'], ['6-10', '6–10 people'],
  ['11-20', '11–20 people'], ['20-plus', '20+ people'],
] as const;

export const PREVIOUS_SOFTWARE = [
  'Acuity', 'Booksy', 'Calendly', 'Goldie', 'Jane', 'Mindbody',
  'Salon Iris', 'Setmore', 'Shortcuts', 'Square', 'None', 'Other',
] as const;

export const CREATE_STEPS: OnboardingStepId[] = [
  'account-type', 'business-identity', 'categories', 'service-location',
  'physical-location', 'team-size', 'software', 'complete',
];

export function activeSteps(serviceLocationType?: string): OnboardingStepId[] {
  return serviceLocationType === 'physical'
    ? CREATE_STEPS
    : CREATE_STEPS.filter((step) => step !== 'physical-location');
}
