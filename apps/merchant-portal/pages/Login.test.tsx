import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ login: vi.fn(), loginWithOAuth: vi.fn(), resetPassword: vi.fn(), enabled: true }));
vi.mock('../services/authService', () => ({
  login: auth.login,
  loginWithOAuth: auth.loginWithOAuth,
  resetPassword: auth.resetPassword,
  isMerchantOAuthEnabled: () => auth.enabled,
}));
vi.mock('../src/auth/accessResolver', () => ({ resolveMerchantAccess: vi.fn(), merchantAccessDestination: vi.fn(() => '/dashboard') }));
import Login from './Login';

describe('merchant Login', () => {
  beforeEach(() => { vi.clearAllMocks(); auth.enabled = true; });

  it('shows Google when enabled and starts merchant Google OAuth once', async () => {
    auth.loginWithOAuth.mockImplementation(() => new Promise(() => undefined));
    render(<MemoryRouter initialEntries={['/login']}><Login /></MemoryRouter>);
    const button = screen.getByRole('button', { name: 'Continue with Google' });
    fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(auth.loginWithOAuth).toHaveBeenCalledTimes(1));
    expect(auth.loginWithOAuth).toHaveBeenCalledWith('google');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Connecting to Google…');
  });

  it('hides Google when disabled and preserves email login', async () => {
    auth.enabled = false;
    render(<MemoryRouter initialEntries={['/login']}><Login /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'owner@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith({ email: 'owner@example.com', password: 'secret12' }));
  });

  it('shows friendly OAuth failure and cancellation messages', async () => {
    auth.loginWithOAuth.mockRejectedValue(new Error("We couldn't sign you in with Google. Please try again."));
    const { unmount } = render(<MemoryRouter initialEntries={['/login']}><Login /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't sign you in with Google");
    unmount();
    render(<MemoryRouter initialEntries={['/login?oauth_error=cancelled']}><Login /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Google sign-in was cancelled.');
  });
});
