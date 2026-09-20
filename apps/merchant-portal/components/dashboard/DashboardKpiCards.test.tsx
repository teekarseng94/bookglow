import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardKpiCards } from './DashboardKpiCards';
import { ExpandableText } from './ExpandableText';
import { MoneyAmount } from './MoneyAmount';

describe('DashboardKpiCards', () => {
  it('keeps the decimal group together on long monetary values', () => {
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

    const value = screen.getByTitle('RM 1,234,567.89');
    expect(value).toHaveClass('dashboard-money');
    expect(value.querySelector('.dashboard-money__tail')?.textContent).toBe('567.89');
    expect(screen.getByRole('article', { name: 'Revenue' })).toBeInTheDocument();
  });
});

describe('MoneyAmount', () => {
  it('does not split the decimal point from the cents', () => {
    const { container } = render(<MoneyAmount value="RM 12,340.50" />);
    expect(container.querySelector('.dashboard-money__tail')?.textContent).toBe('340.50');
  });
});

describe('ExpandableText', () => {
  it('reveals the full name for keyboard and click users', () => {
    render(<ExpandableText text="Aromatherapy massage with hot stone add-on" />);
    const control = screen.getByRole('button');
    expect(control).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(control);
    expect(control).toHaveAttribute('aria-expanded', 'true');
    expect(control).toHaveTextContent('Aromatherapy massage with hot stone add-on');
  });
});
