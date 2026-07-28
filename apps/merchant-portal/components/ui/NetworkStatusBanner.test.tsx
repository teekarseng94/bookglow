import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NetworkStatusBanner } from './NetworkStatusBanner';

describe('NetworkStatusBanner', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('announces offline and recovered states', () => {
    vi.useFakeTimers();
    render(<NetworkStatusBanner />);

    act(() => window.dispatchEvent(new Event('offline')));
    expect(screen.getByText('You’re offline')).toBeInTheDocument();

    act(() => window.dispatchEvent(new Event('online')));
    expect(screen.getByText('Back online')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByText('Back online')).not.toBeInTheDocument();
  });
});
