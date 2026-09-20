import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardKpiCards } from './DashboardKpiCards';

describe('DashboardKpiCards', () => {
  it('keeps long monetary values visible without nowrap clipping', () => {
    render(
      <DashboardKpiCards
        cards={[{
          id: 'revenue',
          label: 'Revenue',
          value: 'RM 1,234,567.89',
          secondary: '128 transactions this month',
          sparkline: [12, 18, 9, 22, 15, 30, 27],
        }]}
      />,
    );

    const value = screen.getByText('RM 1,234,567.89');
    expect(value).toHaveClass('[overflow-wrap:anywhere]');
    expect(value.className).not.toMatch(/nowrap/);
    expect(screen.getByRole('article', { name: 'Revenue' })).toBeInTheDocument();
  });
});
