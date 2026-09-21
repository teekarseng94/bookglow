import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InventoryEditPanel } from './InventoryEditPanel';

describe('InventoryEditPanel', () => {
  it('uses the shared editor drawer instead of a 420px rail', () => {
    render(
      <InventoryEditPanel open title="Edit Service" onClose={vi.fn()}>
        <p>Service form</p>
      </InventoryEditPanel>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Edit Service' });
    expect(dialog).toHaveClass('m-drawer--editor', 'm-drawer--right');
    expect(dialog.className).not.toMatch(/max-w-\[420px\]/);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});
