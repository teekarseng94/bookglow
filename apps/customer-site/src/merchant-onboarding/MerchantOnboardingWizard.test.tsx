import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  loadMerchantDraft: vi.fn(async () => null),
  ensureMerchantWorkspace: vi.fn(async () => undefined),
  hasMerchantWorkspace: vi.fn(async () => false),
  saveMerchantDraft: vi.fn(async () => undefined),
  completeMerchantOnboarding: vi.fn(async () => ({ outlet_id: 'outlet-1', booking_slug: 'fiola' })),
  acceptMerchantInvitation: vi.fn(async () => undefined),
  merchantPortalLoginUrl: () => '/login',
}));

vi.mock('../../services/merchantOnboardingService', () => ({
  loadMerchantDraft: (...args: unknown[]) => service.loadMerchantDraft(...args),
  ensureMerchantWorkspace: (...args: unknown[]) => service.ensureMerchantWorkspace(...args),
  hasMerchantWorkspace: (...args: unknown[]) => service.hasMerchantWorkspace(...args),
  saveMerchantDraft: (...args: unknown[]) => service.saveMerchantDraft(...args),
  completeMerchantOnboarding: (...args: unknown[]) => service.completeMerchantOnboarding(...args),
  acceptMerchantInvitation: (...args: unknown[]) => service.acceptMerchantInvitation(...args),
  merchantPortalLoginUrl: service.merchantPortalLoginUrl,
}));

import MerchantOnboardingWizard from '../../apps/merchant-onboarding/MerchantOnboardingWizard';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  service.hasMerchantWorkspace.mockResolvedValue(false);
  service.loadMerchantDraft.mockResolvedValue(null);
});

describe('MerchantOnboardingWizard mobile continue behavior', () => {
  it('keeps Continue disabled until an account type is chosen', async () => {
    render(<MerchantOnboardingWizard email="owner@example.com" />);
    const continueButton = await screen.findByRole('button', { name: /continue/i });
    expect((continueButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toMatch(/Choose how you want/i);
    expect(document.querySelector('.merchant-onboarding__scroll')).toBeTruthy();
    expect(document.querySelector('.merchant-onboarding__footer')).toBeTruthy();
  });

  it('enables Continue after a required choice and keeps the action bar outside the scroller', async () => {
    render(<MerchantOnboardingWizard email="owner@example.com" />);
    await screen.findByRole('button', { name: /continue/i });
    fireEvent.click(screen.getByRole('radio', { name: /Create a new business account/i }));
    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect((continueButton as HTMLButtonElement).disabled).toBe(false);
    const scroll = document.querySelector('.merchant-onboarding__scroll');
    const footer = document.querySelector('.merchant-onboarding__footer');
    expect(scroll?.contains(footer)).toBe(false);
  });

  it('requires a full business address before Continue on the location step', async () => {
    service.loadMerchantDraft.mockResolvedValue({
      currentStep: 'physical-location',
      payload: {
        accountType: 'create',
        businessName: 'Fiola',
        website: '',
        businessCategories: ['Massage'],
        primaryBusinessCategory: 'Massage',
        serviceLocationType: 'physical',
        teamSize: 'independent',
        previousSoftware: '',
        previousSoftwareOther: '',
        location: { addressDisplay: '', country: 'Malaysia', timezone: 'Asia/Kuala_Lumpur' },
      },
    });
    render(<MerchantOnboardingWizard email="owner@example.com" />);
    const continueButton = await screen.findByRole('button', { name: /continue/i });
    expect((continueButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toMatch(/address/i);
  });

  it('allows scrolling through software options and keeps Continue enabled because the step is optional', async () => {
    service.loadMerchantDraft.mockResolvedValue({
      currentStep: 'software',
      payload: {
        accountType: 'create',
        businessName: 'Fiola',
        website: '',
        businessCategories: ['Massage'],
        primaryBusinessCategory: 'Massage',
        serviceLocationType: 'mobile',
        teamSize: 'independent',
        previousSoftware: '',
        previousSoftwareOther: '',
        location: { addressDisplay: '', country: 'Malaysia', timezone: 'Asia/Kuala_Lumpur' },
      },
    });
    render(<MerchantOnboardingWizard email="owner@example.com" />);
    expect(await screen.findByText(/This is optional/i)).toBeTruthy();
    expect(screen.getByText('Mindbody')).toBeTruthy();
    expect(screen.getByText('None')).toBeTruthy();
    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect((continueButton as HTMLButtonElement).disabled).toBe(false);
  });
});
