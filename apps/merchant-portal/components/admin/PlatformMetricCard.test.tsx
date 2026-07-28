import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlatformMetricCard } from './PlatformMetricCard';

describe('PlatformMetricCard', () => {
  it('renders a live metric and supporting context', () => {
    render(
      <PlatformMetricCard
        label="Active outlets"
        value={12}
        hint="14 total merchant workspaces"
        tone="success"
      />,
    );

    expect(screen.getByText('Active outlets')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('14 total merchant workspaces')).toBeInTheDocument();
  });
});
