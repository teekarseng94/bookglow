import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  verifyMerchantAccountForDeletion: vi.fn(),
}));
const deletion = vi.hoisted(() => ({
  currentStatus: vi.fn(),
  submitMerchantRequest: vi.fn(),
}));

vi.mock('../../services/authService', () => ({
  verifyMerchantAccountForDeletion: auth.verifyMerchantAccountForDeletion,
}));
vi.mock('../../services/accountDeletionService', () => ({
  accountDeletionService: {
    currentStatus: deletion.currentStatus,
    submitMerchantRequest: deletion.submitMerchantRequest,
  },
}));

import { DeleteAccountSection } from './DeleteAccountSection';

describe('DeleteAccountSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deletion.currentStatus.mockResolvedValue({ has_request: false });
    auth.verifyMerchantAccountForDeletion.mockResolvedValue(undefined);
    deletion.submitMerchantRequest.mockResolvedValue('req-456');
  });

  it('shows the destructive delete account action in settings', async () => {
    render(<DeleteAccountSection />);
    expect(await screen.findByRole('button', { name: 'Delete account' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Learn more about account deletion' })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/account-deletion$/),
    );
  });

  it('requires confirmation before submitting a deletion request', async () => {
    render(<DeleteAccountSection />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue with deletion request' }));

    fireEvent.change(screen.getByLabelText(/Confirm account email/i), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.click(screen.getByLabelText(/I understand this request is permanent/i));
    fireEvent.click(screen.getByRole('button', { name: 'Submit deletion request' }));

    await waitFor(() => {
      expect(auth.verifyMerchantAccountForDeletion).toHaveBeenCalled();
      expect(deletion.submitMerchantRequest).toHaveBeenCalled();
    });

    expect(await screen.findByText(/Deletion request submitted/i)).toBeTruthy();
  });
});
