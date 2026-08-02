import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScheduleSetupState } from './ScheduleSetupState';

describe('ScheduleSetupState', () => {
  it('guides a new outlet through services and team setup', () => {
    render(<ScheduleSetupState businessName="Glow Studio" hasServices={false} hasStaff={false} />);

    expect(screen.getByRole('heading', { name: /booking calendar is ready, Glow Studio/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /set up services/i })).toHaveAttribute('href', '/menu');
    expect(screen.getByRole('link', { name: /set up your team/i })).toHaveAttribute('href', '/staff');
  });

  it('shows completed prerequisites without hiding their review links', () => {
    render(<ScheduleSetupState hasServices hasStaff={false} />);

    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /review setup/i })).toHaveAttribute('href', '/menu');
  });
});
