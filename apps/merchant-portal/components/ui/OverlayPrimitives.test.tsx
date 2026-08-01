import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppDrawer } from './AppDrawer';
import { AppModal } from './AppModal';
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

  it('supports a full-screen mobile sheet without rendering a drag handle', () => {
    render(
      <AppSheet open onClose={() => undefined} title="Edit staff" mobileMode="full-screen">
        Staff form
      </AppSheet>,
    );

    const sheet = screen.getByRole('dialog', { name: 'Edit staff' });
    expect(sheet).toHaveClass('m-sheet-panel--fullscreen');
    expect(document.querySelector('.m-sheet-handle')).not.toBeInTheDocument();
  });

  it('supports opt-in full-screen mobile forms in the canonical modal', () => {
    render(
      <AppModal open onClose={() => undefined} title="Edit member" mobileFullscreen>
        Member form
      </AppModal>,
    );

    expect(screen.getByRole('dialog', { name: 'Edit member' })).toHaveClass('m-modal-panel--fullscreen');
  });
});
