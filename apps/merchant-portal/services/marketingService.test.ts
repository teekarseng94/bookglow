import { describe, expect, it } from 'vitest';
import type { Client } from '../types';
import { audienceMatchesClient } from './marketingService';

const client = {
  id: 'client-1',
  outletID: 'outlet-1',
  name: 'Alya',
  email: 'alya@example.com',
  phone: '+60123456789',
  notes: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  points: 80,
  birthday: '1990-07-18',
  memberTier: 'Gold',
  tag: 'VIP',
  voucherCount: 2,
  marketingEmailConsent: true,
  marketingSmsConsent: true,
  marketingWhatsappConsent: true,
} satisfies Client;

describe('audienceMatchesClient', () => {
  it('supports reusable profile and voucher segments', () => {
    expect(audienceMatchesClient({ type: 'all' }, client)).toBe(true);
    expect(audienceMatchesClient({ type: 'birthday_month', value: '7' }, client)).toBe(true);
    expect(audienceMatchesClient({ type: 'member_tier', value: 'Gold' }, client)).toBe(true);
    expect(audienceMatchesClient({ type: 'tag', value: 'VIP' }, client)).toBe(true);
    expect(audienceMatchesClient({ type: 'voucher_holders' }, client)).toBe(true);
  });

  it('evaluates communication eligibility from existing customer data', () => {
    expect(audienceMatchesClient({ type: 'contactable', value: 'email' }, client)).toBe(true);
    expect(audienceMatchesClient({ type: 'contactable', value: 'sms' }, client)).toBe(true);
    expect(audienceMatchesClient({ type: 'contactable', value: 'whatsapp' }, client)).toBe(true);
    expect(
      audienceMatchesClient(
        { type: 'contactable', value: 'email' },
        { ...client, email: '' },
      ),
    ).toBe(false);
    expect(
      audienceMatchesClient(
        { type: 'contactable', value: 'sms' },
        { ...client, marketingSmsConsent: false },
      ),
    ).toBe(false);
  });
});
