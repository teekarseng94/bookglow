import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';
import {
  BottomActionBar,
  MobileFilterSheet,
  MobilePageShell,
  MobileScrollArea,
  SafeAreaSpacer,
} from './MobileShell';

describe('mobile layout primitives', () => {
  it('adds bottom-nav padding and prevents page-level horizontal overflow', () => {
    const { container } = render(
      <MobilePageShell>
        <p>Today</p>
      </MobilePageShell>,
    );
    expect(container.firstChild).toHaveClass('m-page-with-bottom-nav', 'min-w-0', 'overflow-x-hidden');
  });

  it('reserves sticky-action space when a bottom CTA is present', () => {
    const { container } = render(
      <MobilePageShell withStickyAction>
        <MobileScrollArea>
          <EmptyState title="No services yet" />
        </MobileScrollArea>
        <BottomActionBar>
          <button type="button">Continue</button>
        </BottomActionBar>
        <SafeAreaSpacer position="bottom" />
      </MobilePageShell>,
    );
    expect(container.firstChild).toHaveClass('m-page-with-sticky-action');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    expect(container.querySelector('[data-position="bottom"]')).toBeInTheDocument();
  });

  it('opens a filter sheet without rendering a page-level overflow wrapper', () => {
    const onClose = vi.fn();
    render(
      <MobileFilterSheet open onClose={onClose} title="Filters and sort">
        <button type="button">Sort A–Z</button>
      </MobileFilterSheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Filters and sort' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
