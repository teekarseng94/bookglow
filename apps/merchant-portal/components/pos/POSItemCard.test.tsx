import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { POSItemCard } from './POSItemCard';

describe('POSItemCard', () => {
  it('renders phone, tablet, and desktop catalogue variants without clipping the price', () => {
    render(
      <POSItemCard
        name="Aromatherapy massage with hot stone add-on"
        priceLabel="RM 188.90"
        metaLeft="90 mins"
        onAdd={vi.fn()}
      />,
    );

    expect(document.querySelector('.m-pos-mobile-card')).toBeTruthy();
    expect(document.querySelector('.m-pos-tablet-card')).toBeTruthy();
    expect(document.querySelector('.m-pos-desktop-row')).toBeTruthy();
    expect(screen.getAllByTitle('RM 188.90').length).toBeGreaterThan(0);
    expect(document.querySelector('.dashboard-money__tail')?.textContent).toBe('188.90');
    expect(screen.getAllByRole('button', { name: 'Add Aromatherapy massage with hot stone add-on' }).length).toBeGreaterThan(0);
  });
});
