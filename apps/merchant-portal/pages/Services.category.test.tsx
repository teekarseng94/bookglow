import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Package, Product, Service } from '../types';

vi.mock('../contexts/UserContext', () => ({
  useUserContext: () => ({
    outletId: 'outlet_1',
    outletName: 'Test Outlet',
    role: 'admin',
    loading: false,
  }),
}));

vi.mock('../services/databaseService', () => ({
  getCurrentOutletID: () => 'outlet_1',
  outletService: {
    getById: vi.fn(async () => ({ name: 'Test Outlet', address: '1 Test Street' })),
  },
}));

vi.mock('../services/storageService', () => ({
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
  getServiceImagePath: vi.fn(),
}));

import Services from './Services';

const service = (patch: Partial<Service> = {}): Service => ({
  id: 'svc-1',
  outletID: 'outlet_1',
  name: 'Classic Facial',
  price: 80,
  duration: 60,
  category: 'Facial',
  points: 0,
  isCommissionable: true,
  isVisible: true,
  description: '',
  ...patch,
});

function renderMenu(categories: string[], extra?: { services?: Service[]; products?: Product[]; packages?: Package[] }) {
  const onAddCategory = vi.fn(async (name: string) => undefined);
  render(
    <MemoryRouter>
      <Services
        services={extra?.services ?? [service()]}
        products={extra?.products ?? []}
        packages={extra?.packages ?? []}
        categories={categories}
        onUpdateService={vi.fn()}
        onAddService={vi.fn()}
        onDeleteService={vi.fn()}
        onUpdateProduct={vi.fn()}
        onAddProduct={vi.fn()}
        onDeleteProduct={vi.fn()}
        onUpdatePackage={vi.fn()}
        onAddPackage={vi.fn()}
        onDeletePackage={vi.fn()}
        onAddCategory={onAddCategory}
        onEditCategory={vi.fn()}
        onDeleteCategory={vi.fn()}
        onReorderCategories={vi.fn()}
      />
    </MemoryRouter>,
  );
  return { onAddCategory };
}

describe('Menu & Inventory categories', () => {
  it('does not default a new service to Massage', () => {
    renderMenu(['Massage', 'Facial']);
    fireEvent.click(screen.getAllByRole('button', { name: /add service/i })[0]);
    expect(screen.getByRole('button', { name: /category/i })).toHaveTextContent('Select category');
    expect(screen.getByRole('button', { name: /category/i })).not.toHaveTextContent('Massage');
  });

  it('keeps an existing service category when editing', () => {
    renderMenu(['Massage', 'Facial']);
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Classic Facial' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(screen.getByRole('button', { name: /category/i })).toHaveTextContent('Facial');
  });

  it('filters with merchant-defined categories including All Categories', () => {
    renderMenu(['Nail Art', 'Gel']);
    const all = screen.getAllByRole('option', { name: 'All Categories' });
    expect(all.length).toBeGreaterThan(0);
    expect(screen.getAllByRole('option', { name: 'Nail Art' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('option', { name: 'Massage' })).toBeNull();
  });
});
