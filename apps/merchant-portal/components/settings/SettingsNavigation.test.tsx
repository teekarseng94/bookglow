import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsNavigation } from './SettingsNavigation';

describe('SettingsNavigation', () => {
  it('uses a full-label section dropdown below the md breakpoint', () => {
    render(<SettingsNavigation activeId="business-profile" onSelect={vi.fn()} />);
    const jump = screen.getByRole('combobox', { name: 'Settings sections' });
    expect(jump).toHaveClass('w-full');
    expect(screen.getByRole('option', { name: 'Access & permissions' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Operating hours' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Settings sections' }).className).toMatch(/hidden md:block/);
  });

  it('keeps the selected settings section reachable', () => {
    const onSelect = vi.fn();
    render(<SettingsNavigation activeId="business-profile" onSelect={onSelect} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Settings sections' }), {
      target: { value: 'operating-hours' },
    });
    expect(onSelect).toHaveBeenCalledWith('operating-hours');
  });
});
