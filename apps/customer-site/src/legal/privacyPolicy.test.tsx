import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PrivacyPolicyPage } from '../../apps/legal/PrivacyPolicyPage';
import { Footer } from '../../components/landing/Footer';
import {
  BOOKGLOW_ACCOUNT_DELETION_URL,
  BOOKGLOW_LEGAL_ENTITY,
  BOOKGLOW_PRIVACY_EMAIL,
  BOOKGLOW_PRIVACY_PATH,
  PRIVACY_POLICY_EFFECTIVE_DATE,
} from '../legal/legalContact';

describe('public privacy policy', () => {
  // The single-fork suite can reuse Testing Library after another file has
  // registered its auto-cleanup. Keep this file's DOM lifecycle explicit.
  afterEach(cleanup);

  it('publishes the required policy without login', () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeTruthy();
    const text = document.body.textContent || '';
    expect(text).toContain(PRIVACY_POLICY_EFFECTIVE_DATE);
    expect(text).toContain(BOOKGLOW_PRIVACY_EMAIL);
    expect(text).toContain(BOOKGLOW_LEGAL_ENTITY);
    expect(text).toContain(BOOKGLOW_ACCOUNT_DELETION_URL);
    expect(text).toContain('Delete account');
    expect(text).toContain('Data that may be deleted');
    expect(document.title).toContain('Privacy Policy');
  });

  it('discloses the current production providers', () => {
    render(<PrivacyPolicyPage />);
    const text = document.body.textContent || '';
    expect(text).toMatch(/Supabase/);
    expect(text).toMatch(/Vercel/);
    expect(text).toMatch(/HitPay/);
    expect(text).toMatch(/Resend/);
    expect(text).toMatch(/Twilio/);
    expect(text).toMatch(/Google Gemini/);
    expect(text).not.toMatch(/Firestore/i);
    expect(text).not.toMatch(/Firebase Auth/i);
  });

  it('links Privacy Policy from the public footer', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: 'Privacy Policy' });
    expect(link.getAttribute('href')).toBe(BOOKGLOW_PRIVACY_PATH);
  });
});
