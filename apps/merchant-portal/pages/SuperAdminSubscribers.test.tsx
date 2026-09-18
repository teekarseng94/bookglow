import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAll = vi.hoisted(() => vi.fn());
const setOutletAccess = vi.hoisted(() => vi.fn());
const deleteOutlet = vi.hoisted(() => vi.fn());
const openOutletInspector = vi.hoisted(() => vi.fn());

vi.mock('../services/databaseService', () => ({ outletService: { getAll } }));
vi.mock('../services/platformOperationsService', () => ({ platformOperationsService: { setOutletAccess, deleteOutlet } }));
vi.mock('../components/admin/OutletInspectorContext', () => ({ useOutletInspector: () => ({ openOutletInspector }) }));

import SuperAdminSubscribers from './SuperAdminSubscribers';

describe('SuperAdminSubscribers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAll.mockResolvedValue([{ outletID: 'outlet-1', name: 'Eurofashion', email: 'shop@example.com', accessStatus: 'active' }]);
    setOutletAccess.mockResolvedValue({});
    deleteOutlet.mockResolvedValue({ deleted: true });
  });

  it('places Delete beside Suspend on each directory row and requires typed confirmation', async () => {
    render(<MemoryRouter><SuperAdminSubscribers /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('heading', { name: 'Delete this outlet permanently?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete outlet' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Type “Eurofashion”'), { target: { value: 'Eurofashion' } });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Merchant asked to start over' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete outlet' }));

    await waitFor(() => expect(deleteOutlet).toHaveBeenCalledWith('outlet-1', 'Merchant asked to start over', 'Eurofashion'));
  });
});
