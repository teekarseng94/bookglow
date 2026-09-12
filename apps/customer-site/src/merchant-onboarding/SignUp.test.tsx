import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ getMerchantSession: vi.fn(), registerMerchantWithProvider: vi.fn(), registerMerchantWithEmail: vi.fn() }));
vi.mock('../../services/merchantAuthService', () => ({ ...auth, isMerchantProviderEnabled: (p: string) => p === 'google', merchantAuthError: (e: Error) => e.message, merchantOAuthReturnError: () => '', signInMerchantForOnboarding: vi.fn() }));
vi.mock('../../apps/merchant-onboarding/MerchantOnboardingWizard', () => ({ default: ({ email }: { email: string }) => <div>Onboarding for {email}</div> }));
import SignUp from '../../apps/booking/SignUp';
beforeEach(() => { vi.resetAllMocks(); auth.getMerchantSession.mockResolvedValue(null); window.history.replaceState(null, '', '/signup'); });
afterEach(cleanup);
it('locks Google submissions while redirecting and bundles the official logo', async () => {
  auth.registerMerchantWithProvider.mockReturnValue(new Promise(() => {}));
  render(<SignUp />);
  const button = await screen.findByRole('button', { name: 'Continue with Google' });
  expect(button.querySelector('img')?.getAttribute('src')).toBe('/brands/google.png');
  fireEvent.click(button); fireEvent.click(button);
  expect(auth.registerMerchantWithProvider).toHaveBeenCalledTimes(1);
  expect((screen.getByRole('button', { name: 'Connecting…' }) as HTMLButtonElement).disabled).toBe(true);
});
it('shows failures and allows another attempt', async () => {
  auth.registerMerchantWithProvider.mockRejectedValue(new Error('Connection failed'));
  render(<SignUp />);
  fireEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Connection failed');
  expect((screen.getByRole('button', { name: 'Continue with Google' }) as HTMLButtonElement).disabled).toBe(false);
});
it('restores authenticated users into existing onboarding', async () => {
  auth.getMerchantSession.mockResolvedValue({ user: { email: 'merchant@example.com' } });
  render(<SignUp />);
  expect(await screen.findByText('Onboarding for merchant@example.com')).toBeTruthy();
});
it('preserves email confirmation', async () => {
  auth.registerMerchantWithEmail.mockResolvedValue({ confirmationRequired: true });
  render(<SignUp />);
  fireEvent.click(await screen.findByRole('button', { name: 'Continue with email' }));
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'merchant@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  await waitFor(() => expect(screen.getByText('Check your email')).toBeTruthy());
});
