import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StaffSummaryCards } from './StaffSummaryCards';

describe('StaffSummaryCards', () => {
  it('renders a compact metric rail for phone density', () => {
    const { container } = render(
      <StaffSummaryCards
        cards={[
          { id: 'total', label: 'Total Staff', value: '8', hint: '8 shown', icon: null },
          { id: 'active', label: 'Active Today', value: '4', hint: '50%', icon: null },
        ]}
      />,
    );

    expect(container.querySelector('.m-metric-rail--rail')).toBeTruthy();
    expect(screen.getAllByText('Total Staff').length).toBeGreaterThan(0);
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
  });
});
