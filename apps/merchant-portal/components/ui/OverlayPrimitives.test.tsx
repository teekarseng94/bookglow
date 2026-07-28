import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppDrawer } from './AppDrawer';
import { AppSheet } from './AppSheet';

describe('overlay primitives', () => {
  it('gives drawers a stable accessible name and description', () => {
    render(
      <AppDrawer
        open
        onClose={() => undefined}
        title={<span>Booking details</span>}
        description="Review this appointment."
      >
        Drawer body
      </AppDrawer>,
    );

    const drawer = screen.getByRole('dialog', { name: 'Booking details' });
    expect(drawer).toHaveAccessibleDescription('Review this appointment.');
  });

  it('gives untitled sheets a useful fallback name', () => {
    render(
      <AppSheet open onClose={() => undefined}>
        Filter controls
      </AppSheet>,
    );

    expect(screen.getByRole('dialog', { name: 'Options' })).toBeInTheDocument();
  });
});
