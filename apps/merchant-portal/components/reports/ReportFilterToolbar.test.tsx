import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReportFilterToolbar } from './ReportFilterToolbar';

describe('ReportFilterToolbar', () => {
  it('keeps chips on their own full-width row', () => {
    const { container } = render(
      <ReportFilterToolbar
        searchValue=""
        onSearchChange={vi.fn()}
        chips={<button type="button">Sales</button>}
        desktopSort={<select aria-label="Sort"><option>Date</option></select>}
      />,
    );

    expect(container.querySelector('.m-filter-toolbar')).toHaveClass('lg:flex-wrap');
    expect(screen.getByRole('button', { name: 'Sales' }).parentElement?.parentElement).toHaveClass('w-full');
  });
});
