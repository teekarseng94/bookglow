import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const team = vi.hoisted(() => ({
  listOutletAccounts: vi.fn(),
  inviteOutletAccount: vi.fn(),
  setOutletAccountStatus: vi.fn(),
}));

vi.mock('../../contexts/UserContext', () => ({
  useUserContext: () => ({ role: 'admin' }),
}));

vi.mock('../../services/teamAccessService', () => team);

import { TeamAccess } from './TeamAccess';

describe('TeamAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces the edge function failure with a retry and hides the empty quota', async () => {
    team.listOutletAccounts.mockRejectedValue(new Error('Failed to send a request to the Edge Function'));
    render(<TeamAccess outletId="outlet-1" />);

    expect(screen.queryByText(/Account usage/)).not.toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Team accounts could not be loaded.');
    expect(screen.queryByText(/Edge Function/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('keeps send invitation disabled until the email is valid', async () => {
    team.listOutletAccounts.mockResolvedValue([]);
    render(<TeamAccess outletId="outlet-1" />);

    expect(await screen.findByText('Account usage: 0 of 3')).toBeInTheDocument();
    const send = screen.getByRole('button', { name: 'Send invitation' });
    expect(send).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Invite account'), { target: { value: 'owner@studio.com' } });
    expect(send).toBeEnabled();
  });
});
