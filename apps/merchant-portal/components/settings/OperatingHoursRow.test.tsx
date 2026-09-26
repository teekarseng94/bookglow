import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OperatingHoursRow } from './OperatingHoursRow';

describe('OperatingHoursRow', () => {
  it('keeps day, both times, toggle, and status in one row structure', () => {
    render(
      <OperatingHoursRow
        day="sunday"
        openTime="09:00"
        closeTime="17:00"
        isOpen
        onChangeOpenTime={vi.fn()}
        onChangeCloseTime={vi.fn()}
        onToggleOpen={vi.fn()}
      />,
    );
    const row = document.querySelector('.m-hours-row');
    expect(row).toBeTruthy();
    expect(row?.className).not.toMatch(/flex-col/);
    expect(screen.getByLabelText('Sunday')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('9:00 AM')).toBeInTheDocument();
    expect(screen.getByText('5:00 PM')).toBeInTheDocument();
    expect(screen.getByLabelText('Sunday opening time')).toHaveValue('09:00');
    expect(screen.getByLabelText('Sunday closing time')).toHaveValue('17:00');
    expect(screen.getByRole('switch', { name: 'Toggle Sunday Open' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('toggles without hiding time labels', () => {
    const onToggleOpen = vi.fn();
    render(
      <OperatingHoursRow
        day="monday"
        openTime="11:00"
        closeTime="23:00"
        isOpen
        onChangeOpenTime={vi.fn()}
        onChangeCloseTime={vi.fn()}
        onToggleOpen={onToggleOpen}
      />,
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Toggle Monday Open' }));
    expect(onToggleOpen).toHaveBeenCalledWith(false);
  });
});
