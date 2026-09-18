import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const search = vi.hoisted(() => vi.fn());
const openOutletInspector = vi.hoisted(() => vi.fn());
const remoteEnter = vi.hoisted(() => vi.fn());
vi.mock('../../services/superAdminPhase1Service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/superAdminPhase1Service')>();
  return { ...actual, superAdminPhase1Service: { ...actual.superAdminPhase1Service, search } };
});
vi.mock('./OutletInspectorContext', () => ({ useOutletInspector: () => ({ openOutletInspector }) }));
vi.mock('../../services/remoteAccessService', () => ({ remoteAccessService: { enter: remoteEnter } }));

import GlobalSuperAdminSearch from './GlobalSuperAdminSearch';

const outlet = { type: 'outlet' as const, id: 'outlet-1', title: 'Bali Wellness', matchedText: 'Bali Wellness', outletId: 'outlet-1', outletName: 'Bali Wellness', status: 'active', timestamp: '2026-09-18T00:00:00Z' };
const user = { type: 'user' as const, id: 'user-1', title: 'Aisha Noor', matchedText: 'aisha@example.com', outletId: 'outlet-1', outletName: 'Bali Wellness', status: 'active', timestamp: null };

const LocationProbe = () => <output data-testid="location">{useLocation().pathname}{useLocation().search}</output>;
const setup = () => render(<MemoryRouter><GlobalSuperAdminSearch /><LocationProbe /></MemoryRouter>);
const desktopInput = () => screen.getAllByRole('searchbox', { name: 'Global platform search' })[0];
const advanceSearch = async () => {
  await act(async () => {
    vi.advanceTimersByTime(300);
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('GlobalSuperAdminSearch', () => {
  beforeEach(() => { vi.useFakeTimers(); search.mockReset(); openOutletInspector.mockReset(); remoteEnter.mockReset(); });
  afterEach(() => vi.useRealTimers());

  it('debounces requests and renders grouped authoritative results', async () => {
    search.mockResolvedValue([outlet, user]);
    setup();
    fireEvent.focus(desktopInput());
    fireEvent.change(desktopInput(), { target: { value: 'bali' } });
    await act(async () => { vi.advanceTimersByTime(299); });
    expect(search).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1); await Promise.resolve(); await Promise.resolve(); });
    expect(search).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Outlets')).toBeInTheDocument();
    expect(screen.getByText('Merchant accounts')).toBeInTheDocument();
  });

  it('shows loading, no-result, and error states without exposing raw query logs', async () => {
    let resolve!: (value: unknown[]) => void;
    search.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    setup();
    fireEvent.focus(desktopInput());
    fireEvent.change(desktopInput(), { target: { value: 'missing' } });
    await advanceSearch();
    expect(search).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Searching authoritative platform records/)).toBeInTheDocument();
    await act(async () => { resolve([]); await Promise.resolve(); });
    expect(screen.getByText(/No matching records/)).toBeInTheDocument();
    search.mockRejectedValueOnce(new Error('Server unavailable'));
    fireEvent.change(desktopInput(), { target: { value: 'failure' } });
    await advanceSearch();
    expect(screen.getByText('Search unavailable')).toBeInTheDocument();
  });

  it('supports arrow-key selection, Enter, and Escape', async () => {
    search.mockResolvedValue([outlet, user]);
    setup();
    fireEvent.focus(desktopInput());
    fireEvent.change(desktopInput(), { target: { value: 'ai' } });
    await advanceSearch();
    expect(screen.getAllByRole('option')).toHaveLength(2);
    fireEvent.keyDown(desktopInput(), { key: 'ArrowDown' });
    fireEvent.keyDown(desktopInput(), { key: 'Enter' });
    expect(openOutletInspector).toHaveBeenCalledWith('outlet-1', 'accounts');
    fireEvent.focus(desktopInput());
    fireEvent.keyDown(desktopInput(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('routes support and operation results with selected record filters', async () => {
    search.mockResolvedValueOnce([{ type: 'support_case', id: 'case-1042', title: 'Case case-1042', matchedText: 'case-1042', outletId: 'outlet-1', outletName: 'Bali Wellness', status: 'open', timestamp: null }]);
    const view = setup();
    fireEvent.focus(desktopInput());
    fireEvent.change(desktopInput(), { target: { value: 'case' } });
    await advanceSearch();
    fireEvent.click(screen.getByRole('option'));
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/support?case=case-1042');

    view.unmount();
    search.mockResolvedValueOnce([{ type: 'operation', id: 'corr-1042', title: 'Correlation corr-1042', matchedText: 'corr-1042', outletId: 'outlet-1', outletName: 'Bali Wellness', status: 'warning', timestamp: '2026-09-18T02:00:00Z' }]);
    setup();
    fireEvent.focus(desktopInput());
    fireEvent.change(desktopInput(), { target: { value: 'corr' } });
    await advanceSearch();
    fireEvent.click(screen.getByRole('option'));
    expect(screen.getByTestId('location').textContent).toContain('/admin/integrations-jobs?');
    expect(screen.getByTestId('location').textContent).toContain('operation=corr-1042');
    expect(screen.getByTestId('location').textContent).toContain('outlet=outlet-1');
  });

  it('validates remote access before opening booking or sale records', async () => {
    remoteEnter.mockReturnValue(new Promise(() => undefined));
    search.mockResolvedValue([{ type: 'booking', id: 'booking-1042', title: 'Booking booking-1042', matchedText: 'booking-1042', outletId: 'outlet-1', outletName: 'Bali Wellness', status: 'scheduled', timestamp: null }]);
    setup();
    fireEvent.focus(desktopInput());
    fireEvent.change(desktopInput(), { target: { value: 'book' } });
    await advanceSearch();
    fireEvent.click(screen.getByRole('option'));
    expect(remoteEnter).toHaveBeenCalledWith('outlet-1');
  });

  it.each([320, 390, 768, 1440])('keeps a bounded search control at %ipx', (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    setup();
    expect(screen.getByRole('button', { name: 'Open global platform search' })).toBeInTheDocument();
    expect(desktopInput()).toHaveClass('w-full');
  });
});
