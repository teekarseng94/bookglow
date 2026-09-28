import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyOnboardingPayload, type MerchantOnboardingPayload } from '../../apps/merchant-onboarding/onboardingTypes';

const service = vi.hoisted(() => ({
  loadMerchantDraft: vi.fn(async () => null),
  loadMerchantIdentity: vi.fn(async () => ({ firstName: '', lastName: '', phone: null, isGoogle: false })),
  ensureMerchantWorkspace: vi.fn(async () => undefined),
  hasMerchantWorkspace: vi.fn(async () => false),
  saveMerchantDraft: vi.fn(async () => undefined),
  savePersonalProfile: vi.fn(async () => undefined),
  completeMerchantOnboarding: vi.fn(async () => ({ outlet_id: 'outlet-1', booking_slug: 'fiola' })),
  acceptMerchantInvitation: vi.fn(async () => undefined),
  merchantPortalLoginUrl: () => '/login',
}));

vi.mock('../../services/merchantOnboardingService', () => ({
  loadMerchantDraft: service.loadMerchantDraft,
  loadMerchantIdentity: service.loadMerchantIdentity,
  ensureMerchantWorkspace: service.ensureMerchantWorkspace,
  hasMerchantWorkspace: service.hasMerchantWorkspace,
  saveMerchantDraft: service.saveMerchantDraft,
  savePersonalProfile: service.savePersonalProfile,
  completeMerchantOnboarding: service.completeMerchantOnboarding,
  acceptMerchantInvitation: service.acceptMerchantInvitation,
  merchantPortalLoginUrl: service.merchantPortalLoginUrl,
}));

import MerchantOnboardingWizard from '../../apps/merchant-onboarding/MerchantOnboardingWizard';

function completedPersonal(patch: Partial<MerchantOnboardingPayload> = {}): MerchantOnboardingPayload {
  return {
    ...emptyOnboardingPayload(),
    firstName: 'Desa',
    lastName: 'Petaling',
    phoneNational: '12 382 9709',
    phoneE164: '+60123829709',
    country: 'Malaysia',
    legalAccepted: true,
    personalDetailsCompleted: true,
    ...patch,
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
  service.hasMerchantWorkspace.mockResolvedValue(false);
  service.loadMerchantDraft.mockResolvedValue(null);
  service.loadMerchantIdentity.mockResolvedValue({ firstName: '', lastName: '', phone: null, isGoogle: false });
});

describe('MerchantOnboardingWizard personal details', () => {
  it('lands new merchants on Finish signing up first', async () => {
    render(<MerchantOnboardingWizard email="owner@example.com" />);
    expect(await screen.findByRole('heading', { name: /finish signing up/i })).toBeTruthy();
    expect(screen.getByLabelText(/first name/i)).toBeTruthy();
    expect(screen.getByLabelText(/mobile number/i)).toBeTruthy();
    expect((screen.getByLabelText(/country calling code/i) as HTMLSelectElement).value).toBe('+60');
    expect(screen.getByDisplayValue('Malaysia')).toBeTruthy();
    expect(screen.queryByLabelText(/^password$/i)).toBeNull();
    expect(screen.queryByRole('radio', { name: /Create a new business account/i })).toBeNull();
    const continueButton = screen.getByRole('button', { name: /^continue$/i });
    expect((continueButton as HTMLButtonElement).disabled).toBe(false);
  });

  it('does not show personal details when a merchant workspace already exists', async () => {
    const replace = vi.fn();
    vi.stubGlobal('location', { replace, assign: vi.fn(), href: 'http://localhost/' });
    service.hasMerchantWorkspace.mockResolvedValue(true);
    render(<MerchantOnboardingWizard email="owner@example.com" />);
    await waitFor(() => expect(service.hasMerchantWorkspace).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: /finish signing up/i })).toBeNull();
    expect(screen.getByRole('status').textContent).toMatch(/Loading your setup/i);
  });

  it('prefills Google given and family names and never asks for a password', async () => {
    service.loadMerchantIdentity.mockResolvedValue({
      firstName: 'Desa',
      lastName: 'Petaling',
      phone: null,
      isGoogle: true,
    });
    render(<MerchantOnboardingWizard email="google@example.com" />);
    expect(await screen.findByDisplayValue('Desa')).toBeTruthy();
    expect(screen.getByDisplayValue('Petaling')).toBeTruthy();
    expect(screen.queryByLabelText(/^password$/i)).toBeNull();
  });

  it('blocks continue when the phone number is empty', async () => {
    render(<MerchantOnboardingWizard email="owner@example.com" />);
    await screen.findByRole('heading', { name: /finish signing up/i });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Desa' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    expect(await screen.findAllByText(/valid mobile number/i)).not.toHaveLength(0);
    expect(service.savePersonalProfile).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /finish signing up/i })).toBeTruthy();
  });

  it('blocks continue when the phone number is invalid', async () => {
    render(<MerchantOnboardingWizard email="owner@example.com" />);
    await screen.findByRole('heading', { name: /finish signing up/i });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Desa' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    expect(await screen.findAllByText(/valid mobile number/i)).not.toHaveLength(0);
    expect(service.savePersonalProfile).not.toHaveBeenCalled();
  });

  it('requires consent before continuing', async () => {
    render(<MerchantOnboardingWizard email="owner@example.com" />);
    await screen.findByRole('heading', { name: /finish signing up/i });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Desa' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '123829709' } });
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    expect(await screen.findAllByText(/agree to the Privacy Policy/i)).not.toHaveLength(0);
    expect(service.savePersonalProfile).not.toHaveBeenCalled();
  });

  it('saves a valid Malaysian number as E.164 and advances to business setup', async () => {
    render(<MerchantOnboardingWizard email="owner@example.com" />);
    await screen.findByRole('heading', { name: /finish signing up/i });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: '  Desa  ' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Petaling' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '12 382 9709' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    await screen.findByRole('heading', { name: /professional account/i });
    expect(service.savePersonalProfile).toHaveBeenCalledWith({
      firstName: 'Desa',
      lastName: 'Petaling',
      phoneE164: '+60123829709',
    });
    expect(service.saveMerchantDraft).toHaveBeenCalledWith(
      'account-type',
      expect.objectContaining({ personalDetailsCompleted: true, phoneE164: '+60123829709' }),
    );
  });

  it('resumes later business steps only after personal details were saved', async () => {
    service.loadMerchantDraft.mockResolvedValue({
      currentStep: 'physical-location',
      payload: completedPersonal({
        accountType: 'create',
        businessName: 'Fiola',
        website: '',
        businessCategories: ['Massage'],
        primaryBusinessCategory: 'Massage',
        serviceLocationType: 'physical',
        teamSize: 'independent',
      }),
    });
    render(<MerchantOnboardingWizard email="owner@example.com" />);
    expect(await screen.findByRole('heading', { name: /physical location/i })).toBeTruthy();
  });

  it('keeps unfinished identity on personal details even if a later step was stored', async () => {
    service.loadMerchantDraft.mockResolvedValue({
      currentStep: 'business-identity',
      payload: {
        ...emptyOnboardingPayload(),
        accountType: 'create',
        businessName: 'Fiola',
      },
    });
    render(<MerchantOnboardingWizard email="owner@example.com" />);
    expect(await screen.findByRole('heading', { name: /finish signing up/i })).toBeTruthy();
  });
});

describe('MerchantOnboardingWizard mobile continue behavior', () => {
  it('keeps Continue disabled until an account type is chosen', async () => {
    service.loadMerchantDraft.mockResolvedValue({
      currentStep: 'account-type',
      payload: completedPersonal(),
    });
    render(<MerchantOnboardingWizard email="owner@example.com" />);
    const continueButton = await screen.findByRole('button', { name: /continue/i });
    expect((continueButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toMatch(/Choose how you want/i);
    expect(document.querySelector('.merchant-onboarding__scroll')).toBeTruthy();
    expect(document.querySelector('.merchant-onboarding__footer')).toBeTruthy();
  });

  it('enables Continue after a required choice and keeps the action bar outside the scroller', async () => {
    service.loadMerchantDraft.mockResolvedValue({
      currentStep: 'account-type',
      payload: completedPersonal(),
    });
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
      payload: completedPersonal({
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
      }),
    });
    render(<MerchantOnboardingWizard email="owner@example.com" />);
    const continueButton = await screen.findByRole('button', { name: /continue/i });
    expect((continueButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toMatch(/address/i);
  });

  it('allows scrolling through software options and keeps Continue enabled because the step is optional', async () => {
    service.loadMerchantDraft.mockResolvedValue({
      currentStep: 'software',
      payload: completedPersonal({
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
      }),
    });
    render(<MerchantOnboardingWizard email="owner@example.com" />);
    expect(await screen.findByText(/This is optional/i)).toBeTruthy();
    expect(screen.getByText('Mindbody')).toBeTruthy();
    expect(screen.getByText('None')).toBeTruthy();
    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect((continueButton as HTMLButtonElement).disabled).toBe(false);
  });
});
