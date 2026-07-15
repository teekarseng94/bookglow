import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BookingErrorBoundary } from './BookingErrorBoundary';

function Bomb({ message = 'boom' }: { message?: string }): React.ReactElement {
  throw new Error(message);
}

describe('BookingErrorBoundary', () => {
  beforeEach(() => {
    // Silence React's expected error logging for these deliberate throws.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the V2-styled fallback (role=alert) when a child throws', () => {
    render(
      <BookingErrorBoundary>
        <Bomb />
      </BookingErrorBoundary>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toBeTruthy();
    expect(screen.getByText('We hit a snag')).toBeTruthy();
    // Fallback is wrapped in the V2 scope so tokens apply.
    expect(alert.closest('.bg-v2')).not.toBeNull();
  });

  it('does not expose the raw error message to the customer', () => {
    render(
      <BookingErrorBoundary>
        <Bomb message="FirebaseError: PERMISSION_DENIED secret internals" />
      </BookingErrorBoundary>,
    );
    expect(screen.queryByText(/FirebaseError|PERMISSION_DENIED|secret/)).toBeNull();
  });

  it('provides a retry action that invokes onReset', () => {
    const onReset = vi.fn();
    render(
      <BookingErrorBoundary onReset={onReset}>
        <Bomb />
      </BookingErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('renders children normally when there is no error', () => {
    render(
      <BookingErrorBoundary>
        <p>all good</p>
      </BookingErrorBoundary>,
    );
    expect(screen.getByText('all good')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
