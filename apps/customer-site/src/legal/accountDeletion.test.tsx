import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AccountDeletionPage } from '../../apps/legal/AccountDeletionPage';

vi.mock('../../services/accountDeletionService', () => ({
  submitPublicAccountDeletionRequest: vi.fn(async () => 'req-123'),
}));

import { submitPublicAccountDeletionRequest } from '../../services/accountDeletionService';

describe('account deletion request page', () => {
  it('submits a public deletion request without requiring login', async () => {
    render(<AccountDeletionPage />);
    expect(screen.getByRole('heading', { name: 'Account deletion request' })).toBeTruthy();
    expect(screen.getByText(/BookGlow allows merchants to request deletion/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Account email/i), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit deletion request' }));

    await waitFor(() => {
      expect(submitPublicAccountDeletionRequest).toHaveBeenCalledWith({
        email: 'owner@example.com',
        requesterName: '',
        businessName: '',
        reason: '',
      });
    });

    expect(await screen.findByText(/Your account deletion request has been submitted/i)).toBeTruthy();
    expect(screen.getByText(/Reference: req-123/)).toBeTruthy();
  });
});
