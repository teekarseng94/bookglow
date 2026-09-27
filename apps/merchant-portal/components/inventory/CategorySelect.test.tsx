import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategorySelect } from './CategorySelect';

describe('CategorySelect', () => {
  it('shows a Select category placeholder instead of Massage', () => {
    render(
      <CategorySelect
        value=""
        categories={['Massage', 'Facial']}
        onChange={() => undefined}
        onAddCategory={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: /category/i })).toHaveTextContent('Select category');
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('lists merchant categories and an add action', () => {
    const onChange = vi.fn();
    const onAdd = vi.fn();
    render(
      <CategorySelect
        value=""
        categories={['Nails', 'Pedicure']}
        onChange={onChange}
        onAddCategory={onAdd}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /category/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Nails' }));
    expect(onChange).toHaveBeenCalledWith('Nails');
  });

  it('offers create-first guidance when the merchant has no categories', () => {
    const onAdd = vi.fn();
    render(
      <CategorySelect value="" categories={[]} onChange={() => undefined} onAddCategory={onAdd} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /category/i }));
    expect(screen.getByText('No categories yet')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /create your first category/i }));
    expect(onAdd).toHaveBeenCalled();
  });
});
