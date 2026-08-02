import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TransactionType, type Client, type Transaction } from '../../types';
import { MobileTransactionHistory } from './MobileTransactionHistory';

const longTitle = 'Sale: Full Body Massage 120 minutes with aromatherapy enhancement';
const transaction: Transaction = { id: 'txn_1', outletID: 'outlet_1', date: '2026-08-03T10:56:00', type: TransactionType.SALE, amount: 138, description: longTitle, category: 'Massage', paymentMethod: 'Credit Card', clientId: 'client_1' };
const client = { id: 'client_1', outletID: 'outlet_1', name: 'Aina Lim' } as Client;

describe('MobileTransactionHistory', () => {
  it('keeps long titles accessible and exposes edit, delete and load-more actions', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onLoadMore = vi.fn();
    render(<MobileTransactionHistory groups={[{ key: '2026-08-03', label: 'Today', transactions: [transaction] }]} clients={[client]} hasMore onOpen={vi.fn()} onEdit={onEdit} onDelete={onDelete} onLoadMore={onLoadMore} />);

    expect(screen.getByTitle(longTitle)).toBeInTheDocument();
    expect(screen.getByText('1 transaction')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Edit ${longTitle}` }));
    fireEvent.click(screen.getByRole('button', { name: `Delete ${longTitle}` }));
    fireEvent.click(screen.getByRole('button', { name: /view more transactions/i }));
    expect(onEdit).toHaveBeenCalledWith(transaction);
    expect(onDelete).toHaveBeenCalledWith(transaction);
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('hides delete and disables edit when permissions are locked', () => {
    render(<MobileTransactionHistory groups={[{ key: '2026-08-03', label: 'Today', transactions: [transaction] }]} clients={[client]} isLocked hasMore={false} onOpen={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onLoadMore={vi.fn()} />);

    expect(screen.queryByRole('button', { name: `Delete ${longTitle}` })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Edit ${longTitle}` })).toBeDisabled();
  });
});
