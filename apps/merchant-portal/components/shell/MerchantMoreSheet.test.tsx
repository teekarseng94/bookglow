import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MerchantMoreSheet } from './MerchantMoreSheet';

describe('MerchantMoreSheet', () => {
  it('renders a 2-column icon+title grid without descriptions', () => {
    render(
      <MemoryRouter>
        <MerchantMoreSheet
          onClose={vi.fn()}
          items={[
            { id: 'menu', label: 'Menu & Inventory', icon: <span>I</span>, to: '/menu' },
            { id: 'staff', label: 'Staff & Team', icon: <span>S</span>, to: '/staff' },
          ]}
        />
      </MemoryRouter>,
    );

    const dialog = screen.getByRole('dialog', { name: 'More pages' });
    expect(dialog.querySelector('.bookglow-more-sheet__grid')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Menu & Inventory' })).toHaveClass('bookglow-more-link');
    expect(dialog.querySelectorAll('.bookglow-more-link__label')).toHaveLength(2);
    expect(dialog.textContent).not.toMatch(/Manage your|View your|Open /i);
  });
});
