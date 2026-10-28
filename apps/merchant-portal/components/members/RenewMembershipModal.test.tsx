import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RenewMembershipModal } from './RenewMembershipModal';

describe('RenewMembershipModal amount field', () => {
  it('keeps the RM prefix outside the numeric input', () => {
    render(
      <RenewMembershipModal
        open
        memberName="Gracie"
        paymentMethods={['Cash']}
        onClose={() => undefined}
        onConfirm={vi.fn()}
      />,
    );

    const input = screen.getByRole('textbox', { name: /renewal amount/i });
    expect(input).not.toHaveValue('RM');
    expect(input).toHaveAttribute('placeholder', '100.00');
    fireEvent.change(input, { target: { value: '100.00' } });
    expect(input).toHaveValue('100.00');
    expect(screen.getByText('RM')).toBeInTheDocument();
    expect(screen.getByText(/Will record RM100.00/)).toBeInTheDocument();
  });
});
