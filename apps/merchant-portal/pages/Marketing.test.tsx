import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Service, Voucher } from '../types';
import Marketing from './Marketing';

const { getByOutlet, create, resetVoucher, confirmSoldByCode } = vi.hoisted(() => ({
  getByOutlet: vi.fn(),
  create: vi.fn(),
  resetVoucher: vi.fn(),
  confirmSoldByCode: vi.fn(),
}));

vi.mock('../services/voucherService', () => ({
  voucherService: {
    getByOutlet,
    create,
    resetVoucher,
    confirmSoldByCode,
  },
}));

const services = [
  { id: 'service-1', name: 'Deep Tissue Massage' },
  { id: 'service-2', name: 'Aromatherapy' },
] as Service[];

const vouchers: Voucher[] = [
  {
    id: 'voucher-1',
    outletID: 'outlet-1',
    name: 'Wellness Gift',
    price: 168,
    serviceIds: ['service-1'],
    expiryDate: '2099-12-31',
    status: 'sold',
    slug: 'wellness-gift',
    createdAt: '2026-07-20T08:00:00.000Z',
  },
  {
    id: 'voucher-2',
    outletID: 'outlet-1',
    name: 'Relax Package',
    price: 98,
    serviceIds: ['service-2'],
    expiryDate: '2099-12-31',
    status: 'active',
    slug: 'relax-package',
    createdAt: '2026-07-21T08:00:00.000Z',
  },
];

describe('Marketing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getByOutlet.mockResolvedValue(vouchers);
  });

  it('renders the voucher workspace directly without campaign or audience navigation', async () => {
    render(<Marketing outletID="outlet-1" services={services} role="admin" />);

    expect(await screen.findByRole('heading', { name: 'Vouchers' })).toBeInTheDocument();
    expect(screen.getByText('Wellness Gift')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Campaigns/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Audiences/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Vouchers/ })).not.toBeInTheDocument();
    expect(getByOutlet).toHaveBeenCalledWith('outlet-1');
  });

  it('filters the voucher workspace by search', async () => {
    render(<Marketing outletID="outlet-1" services={services} role="admin" />);
    await screen.findByRole('heading', { name: 'Vouchers' });

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search vouchers' }), {
      target: { value: 'Aromatherapy' },
    });

    expect(screen.getByText('Relax Package')).toBeInTheDocument();
    expect(screen.queryByText('Wellness Gift')).not.toBeInTheDocument();
  });

  it('filters vouchers by the retained status chips', async () => {
    render(<Marketing outletID="outlet-1" services={services} role="admin" />);
    await screen.findByRole('heading', { name: 'Vouchers' });

    fireEvent.click(screen.getByRole('button', { name: 'Active · 1' }));
    expect(screen.getByText('Relax Package')).toBeInTheDocument();
    expect(screen.queryByText('Wellness Gift')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sold · 1' }));
    expect(screen.getByText('Wellness Gift')).toBeInTheDocument();
    expect(screen.queryByText('Relax Package')).not.toBeInTheDocument();
  });

  it('creates a voucher from the dedicated drawer', async () => {
    create.mockResolvedValue(undefined);
    render(<Marketing outletID="outlet-1" services={services} role="admin" />);
    await screen.findByRole('heading', { name: 'Vouchers' });

    fireEvent.click(screen.getAllByRole('button', { name: 'Create voucher' }).at(-1)!);
    fireEvent.change(screen.getByLabelText('Voucher name'), {
      target: { value: 'Birthday Escape' },
    });
    fireEvent.change(screen.getByLabelText('Sale price'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('Expiry date'), {
      target: { value: '2099-11-30' },
    });
    fireEvent.click(screen.getByLabelText('Deep Tissue Massage'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Create voucher' }).at(-1)!);

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        outletID: 'outlet-1',
        name: 'Birthday Escape',
        price: 120,
        serviceIds: ['service-1'],
        expiryDate: '2099-11-30',
      }),
    );
  });

  it('shows a deliberate permission state for non-admin staff', () => {
    render(<Marketing outletID="outlet-1" services={services} role="cashier" />);

    expect(screen.getByText('Marketing access is restricted')).toBeInTheDocument();
    expect(getByOutlet).not.toHaveBeenCalled();
  });
});
