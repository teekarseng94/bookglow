import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OverlayTabs } from './OverlayTabs';
import { FormGrid } from './FormGrid';
import { ScrollTable } from './ScrollTable';

describe('responsive layout primitives', () => {
  it('keeps tab labels on one line and moves selection with arrow keys', () => {
    const onChange = vi.fn();
    render(
      <OverlayTabs
        ariaLabel="Edit sections"
        value="details"
        onChange={onChange}
        items={[
          { id: 'details', label: 'Details' },
          { id: 'pricing', label: 'Pricing' },
          { id: 'availability', label: 'Availability' },
          { id: 'media', label: 'Media' },
        ]}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(screen.getByRole('tab', { name: 'Details' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('pricing');
  });

  it('marks form grids as container-aware two-column layouts', () => {
    const { container } = render(
      <FormGrid>
        <label>Name<input /></label>
        <label>Price<input /></label>
      </FormGrid>,
    );
    expect(container.firstChild).toHaveClass('m-form-grid', 'm-form-grid--2');
  });

  it('exposes tables as a labelled horizontal scroll region', () => {
    render(
      <ScrollTable label="Catalog items">
        <table><tbody><tr><td>RM 1,234,567.89</td></tr></tbody></table>
      </ScrollTable>,
    );
    expect(screen.getByRole('region', { name: 'Catalog items' })).toHaveClass('m-table-scroll');
  });
});
