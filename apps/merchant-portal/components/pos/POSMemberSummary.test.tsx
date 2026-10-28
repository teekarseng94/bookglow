import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { POSMemberSummary } from './POSMemberSummary';

describe('POSMemberSummary membership notice', () => {
  it('renders expired membership copy without hiding paid-checkout children', () => {
    render(
      <POSMemberSummary
        membershipNotice={
          <div>
            <p>Membership Expired</p>
            <p>This customer&apos;s membership has expired. Loyalty points cannot be redeemed until the membership is renewed.</p>
            <p>Available Points: 500</p>
            <p>Membership Status: Expired</p>
          </div>
        }
      >
        <input aria-label="Search by name or phone" />
      </POSMemberSummary>,
    );

    expect(screen.getByText('Membership Expired')).toBeInTheDocument();
    expect(screen.getByText(/Loyalty points cannot be redeemed/)).toBeInTheDocument();
    expect(screen.getByText('Available Points: 500')).toBeInTheDocument();
    expect(screen.getByLabelText('Search by name or phone')).toBeInTheDocument();
  });
});
