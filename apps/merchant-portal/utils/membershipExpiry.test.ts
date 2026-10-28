import { describe, expect, it } from 'vitest';
import {
  addCalendarYears,
  malaysiaCalendarDate,
  membershipStatusLabel,
  resolveMembershipValidity,
} from './membershipExpiry';

describe('membershipExpiry', () => {
  it('adds a calendar year without assuming 365 days', () => {
    expect(addCalendarYears('2025-10-28', 1)).toBe('2026-10-28');
    expect(addCalendarYears('2024-02-29', 1)).toBe('2025-02-28');
  });

  it('keeps membership valid through the expiry calendar day in Malaysia', () => {
    const result = resolveMembershipValidity({
      lastRenewedAt: '2025-10-28T08:00:00+08:00',
      now: new Date('2026-10-28T23:30:00+08:00'),
    });
    expect(result.status).toBe('expiring_soon');
    expect(result.canRedeemPoints).toBe(true);
    expect(result.expiryYmd).toBe('2026-10-28');
  });

  it('blocks redemption from the start of the day after expiry', () => {
    const result = resolveMembershipValidity({
      lastRenewedAt: '2025-10-27T08:00:00+08:00',
      now: new Date('2026-10-28T00:00:00+08:00'),
    });
    expect(result.status).toBe('expired');
    expect(result.canRedeemPoints).toBe(false);
  });

  it('uses join date when the member has never renewed', () => {
    const result = resolveMembershipValidity({
      createdAt: '2026-10-24T03:00:00+08:00',
      now: new Date('2026-10-28T16:00:00+08:00'),
    });
    expect(result.status).toBe('active');
    expect(result.expiryYmd).toBe('2027-10-24');
    expect(result.canRedeemPoints).toBe(true);
  });

  it('marks membership expiring soon within 30 days', () => {
    const result = resolveMembershipValidity({
      lastRenewedAt: '2025-10-10T00:00:00+08:00',
      now: new Date('2026-10-01T12:00:00+08:00'),
    });
    expect(result.status).toBe('expiring_soon');
    expect(membershipStatusLabel(result.status)).toBe('Expiring Soon');
  });

  it('formats Malaysia calendar dates as YYYY-MM-DD', () => {
    expect(malaysiaCalendarDate(new Date('2026-10-28T01:00:00+08:00'))).toBe('2026-10-28');
  });

  it('treats 31 days remaining as active, not expiring soon', () => {
    const result = resolveMembershipValidity({
      lastRenewedAt: '2025-10-28T00:00:00+08:00',
      now: new Date('2026-09-27T12:00:00+08:00'),
    });
    expect(result.status).toBe('active');
    expect(result.canRedeemPoints).toBe(true);
  });

  it('blocks redemption when no membership start exists', () => {
    const result = resolveMembershipValidity({ now: new Date('2026-10-28T12:00:00+08:00') });
    expect(result.status).toBe('expired');
    expect(result.canRedeemPoints).toBe(false);
    expect(result.expiryYmd).toBeNull();
  });
});
