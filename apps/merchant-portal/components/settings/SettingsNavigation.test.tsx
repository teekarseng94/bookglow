import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsNavigation } from './SettingsNavigation';

describe('SettingsNavigation', () => {
  it('keeps section navigation on the desktop sidebar only', () => {
    render(<SettingsNavigation activeId="business-profile" onSelect={vi.fn()} />);
    expect(screen.queryByRole('combobox', { name: 'Settings sections' })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Settings sections' }).className).toMatch(/hidden md:block/);
    expect(screen.getByRole('button', { name: 'Access & permissions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Operating hours' })).toBeInTheDocument();
  });

  it('scrolls to the selected settings section from the desktop nav', () => {
    const onSelect = vi.fn();
    render(<SettingsNavigation activeId="business-profile" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Operating hours' }));
    expect(onSelect).toHaveBeenCalledWith('operating-hours');
  });
});
