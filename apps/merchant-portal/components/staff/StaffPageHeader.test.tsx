import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StaffPageHeader } from './StaffPageHeader';

describe('StaffPageHeader', () => {
  it('uses compact MobilePageActions instead of full-width hero buttons', () => {
    const onAddStaff = vi.fn();
    const onOpenRoleRates = vi.fn();
    const { container } = render(
      <StaffPageHeader onAddStaff={onAddStaff} onOpenRoleRates={onOpenRoleRates} />,
    );

    expect(container.querySelector('.m-page-actions')).toBeTruthy();
    expect(container.querySelector('.flex-1')).toBeFalsy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Roles' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: '+ Add Staff' })[0]);
    expect(onOpenRoleRates).toHaveBeenCalledOnce();
    expect(onAddStaff).toHaveBeenCalledOnce();
  });
});
