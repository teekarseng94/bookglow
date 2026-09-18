import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const inspector = vi.hoisted(() => vi.fn());
const onboarding = vi.hoisted(() => vi.fn());
const integrations = vi.hoisted(() => vi.fn());
const jobs = vi.hoisted(() => vi.fn());
const supportCases = vi.hoisted(() => vi.fn());
const auditPage = vi.hoisted(() => vi.fn());
const billingReadiness = vi.hoisted(() => vi.fn());

vi.mock('../../services/superAdminPhase1Service', () => ({ superAdminPhase1Service: { inspector } }));
vi.mock('../../services/platformStep2Service', () => ({ platformStep2Service: { onboarding, integrations, jobs, supportCases } }));
vi.mock('../../services/auditService', () => ({ auditService: { getPage: auditPage } }));
vi.mock('../../services/platformOperationsService', () => ({ platformOperationsService: { getBillingReadiness: billingReadiness, setOutletAccess: vi.fn(), deleteOutlet: vi.fn() } }));
vi.mock('../../services/accountAdminService', () => ({ accountAdminService: {} }));
vi.mock('../../services/remoteAccessService', () => ({ remoteAccessService: { enter: vi.fn() } }));
vi.mock('../../src/native/androidShell', () => ({ openExternalUrl: vi.fn() }));
vi.mock('../../utils/customerSiteUrl', () => ({ customerSiteOrigin: () => 'https://booking.example' }));

import OutletInspector from './OutletInspector';

const payload = (id: string, name: string) => ({
  summary: { outletId: id, name, portalStatus: 'active', onboardingStatus: 'complete', lastActivityAt: '2026-09-18T00:00:00Z', ownerName: 'Owner', ownerEmail: 'owner@example.com', email: 'merchant@example.com', phone: '+60', bookingSlug: 'bali', timezone: 'Asia/Kuala_Lumpur', businessHoursStatus: 'configured', activeUserCount: 1, recentActivity: [] },
  accounts: [{ id: 'user-1', name: 'Owner', email: 'owner@example.com', role: 'owner', membershipStatus: 'active', accountStatus: 'active', lastSignInAt: null, invitationState: 'accepted' }],
  billing: null,
});

const relatedDefaults = () => {
  onboarding.mockResolvedValue({ rows: [], total: 0 });
  integrations.mockResolvedValue({ rows: [], total: 0 });
  jobs.mockResolvedValue({ rows: [], total: 0, scheduler_instrumentation: 'not_instrumented' });
  supportCases.mockResolvedValue({ rows: [], total: 0 });
  auditPage.mockResolvedValue({ events: [], total: 0, page: 1, pageSize: 25 });
  billingReadiness.mockResolvedValue(null);
};

const renderInspector = (props: Partial<React.ComponentProps<typeof OutletInspector>> = {}) => render(<MemoryRouter><OutletInspector outletId="outlet-1" open selectedTab="summary" onSelectTab={vi.fn()} onClose={vi.fn()} {...props} /></MemoryRouter>);

describe('OutletInspector', () => {
  beforeEach(() => { vi.clearAllMocks(); relatedDefaults(); inspector.mockResolvedValue(payload('outlet-1', 'Bali Wellness')); });

  it('loads the exact outlet and selected tab from authoritative scoped services', async () => {
    renderInspector({ selectedTab: 'accounts' });
    expect(await screen.findByText('Bali Wellness')).toBeInTheDocument();
    expect(screen.getByText('Invite workspace account')).toBeInTheDocument();
    expect(inspector).toHaveBeenCalledWith('outlet-1');
    expect(supportCases).toHaveBeenCalledWith(expect.objectContaining({ outletId: 'outlet-1' }));
  });

  it('prevents a slower prior outlet response from replacing the current outlet', async () => {
    let resolveFirst!: (value: ReturnType<typeof payload>) => void;
    inspector.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; })).mockResolvedValueOnce(payload('outlet-2', 'Current Outlet'));
    const view = renderInspector();
    view.rerender(<MemoryRouter><OutletInspector outletId="outlet-2" open selectedTab="summary" onSelectTab={vi.fn()} onClose={vi.fn()} /></MemoryRouter>);
    expect(await screen.findByText('Current Outlet')).toBeInTheDocument();
    await act(async () => resolveFirst(payload('outlet-1', 'Stale Outlet')));
    await waitFor(() => expect(screen.queryByText('Stale Outlet')).not.toBeInTheDocument());
    expect(screen.getByText('Current Outlet')).toBeInTheDocument();
  });

  it('closes with Escape through the shared focus-trapping drawer', async () => {
    const onClose = vi.fn();
    renderInspector({ onClose });
    await screen.findByText('Bali Wellness');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

