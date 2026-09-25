import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InventoryTypeTabs } from './InventoryTypeTabs';

describe('InventoryTypeTabs', () => {
  it('keeps Services, Products, and Packages labels fully visible', () => {
    function Harness() {
      const [tab, setTab] = useState<'services' | 'products' | 'packages'>('services');
      return <InventoryTypeTabs activeTab={tab} onChange={setTab} />;
    }
    render(<Harness />);
    expect(screen.getByRole('tab', { name: 'Services' })).toHaveTextContent('Services');
    expect(screen.getByRole('tab', { name: 'Products' })).toHaveTextContent('Products');
    expect(screen.getByRole('tab', { name: 'Packages' })).toHaveTextContent('Packages');
    expect(screen.queryByText(/Servi/)).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Packages' }));
    expect(screen.getByRole('tab', { name: 'Packages' })).toHaveAttribute('aria-selected', 'true');
  });

  it('scrolls labels instead of truncating them', () => {
    render(<InventoryTypeTabs activeTab="services" onChange={() => undefined} />);
    const tablist = screen.getByRole('tablist', { name: 'Catalog type' });
    expect(tablist.className).toMatch(/m-overlay-tabs/);
    expect(screen.getByRole('tab', { name: 'Services' }).className).not.toMatch(/truncate/);
  });
});
