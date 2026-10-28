import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemberSummary } from './MemberSummary';

describe('MemberSummary membership status', () => {
  it('shows expiry date for active members', () => {
    render(
      <MemberSummary
        name="Gracie"
        membershipStatus="active"
        expiryLabel="24/10/2027"
      />,
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Expires 24/10/2027')).toBeInTheDocument();
  });

  it('shows expiring soon without disabling redemption copy', () => {
    render(
      <MemberSummary
        name="Gracie"
        membershipStatus="expiring_soon"
        expiryLabel="10/11/2026"
      />,
    );
    expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
    expect(screen.getByText('Expires 10/11/2026')).toBeInTheDocument();
    expect(
      screen.queryByText('Membership Expired – Loyalty Point Redemption Disabled'),
    ).not.toBeInTheDocument();
  });

  it('warns when membership is expired and keeps a renew action', () => {
    const onRenew = vi.fn();
    render(
      <MemberSummary
        name="Gracie"
        membershipStatus="expired"
        onRenewMembership={onRenew}
      />,
    );
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(
      screen.getByText('Membership Expired – Loyalty Point Redemption Disabled'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Renew Membership' })).toBeInTheDocument();
  });
});
