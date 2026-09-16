import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AccountDeletionPage } from '../../apps/legal/AccountDeletionPage';
import { BOOKGLOW_PRIVACY_EMAIL } from '../legal/legalContact';

describe('account deletion request page', () => {
  it('provides a public request form that emails BookGlow support', () => {
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, href: '', assign },
    });

    render(<AccountDeletionPage />);
    expect(screen.getByRole('heading', { name: 'Account deletion request' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Account email/i), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Send deletion request' }).closest('form')!);
    expect(String(window.location.href)).toContain(`mailto:${BOOKGLOW_PRIVACY_EMAIL}`);
    expect(String(window.location.href)).toContain(encodeURIComponent('BookGlow account deletion request'));

    Object.defineProperty(window, 'location', { configurable: true, value: original });
  });
});
