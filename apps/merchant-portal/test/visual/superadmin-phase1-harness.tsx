import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import GlobalSuperAdminSearch from '../../components/admin/GlobalSuperAdminSearch';
import { OutletInspectorProvider, useOutletInspector } from '../../components/admin/OutletInspectorContext';
import { superAdminPhase1Service } from '../../services/superAdminPhase1Service';
import { platformStep2Service } from '../../services/platformStep2Service';
import { platformOperationsService } from '../../services/platformOperationsService';
import { auditService } from '../../services/auditService';
import '../../src/loadStyles';

const outletId = 'outlet-moon-001';
const timestamp = '2026-09-18T02:00:00.000Z';

superAdminPhase1Service.search = async () => [
  { type: 'outlet', id: outletId, outletId, outletName: 'Moonlight Wellness', title: 'Moonlight Wellness', matchedText: outletId, status: 'active', timestamp },
  { type: 'user', id: 'user-001', outletId, outletName: 'Moonlight Wellness', title: 'Aisha Rahman', matchedText: 'aisha@example.test', status: 'active', timestamp },
  { type: 'support_case', id: 'case-1042', outletId, outletName: 'Moonlight Wellness', title: 'Case case-1042', matchedText: 'case-1042', status: 'open', timestamp },
];

superAdminPhase1Service.inspector = async () => ({
  summary: {
    outletId,
    name: 'Moonlight Wellness',
    portalStatus: 'active',
    onboardingStatus: 'ready',
    lastActivityAt: timestamp,
    ownerName: 'Aisha Rahman',
    ownerEmail: 'aisha@example.test',
    email: 'hello@moonlight.example',
    phone: '+60 12-000 1042',
    bookingSlug: 'moonlight-wellness',
    timezone: 'Asia/Kuala_Lumpur',
    businessHoursStatus: 'configured',
    activeUserCount: 3,
    recentActivity: [{ type: 'booking', reference: 'BK-1042', status: 'confirmed', occurredAt: timestamp }],
  },
  accounts: [{ id: 'user-001', name: 'Aisha Rahman', email: 'aisha@example.test', role: 'owner', membershipStatus: 'active', accountStatus: 'active', lastSignInAt: timestamp, invitationState: 'accepted' }],
  billing: { provider: 'stripe', status: 'active', trialEnd: null, currentPeriodStart: '2026-09-01', currentPeriodEnd: '2026-09-30', unitAmount: 12900, currency: 'myr', recurringInterval: 'month', intervalCount: 1, quantity: 1, discountPercent: 0, mrrReliable: true },
});

platformStep2Service.onboarding = async () => ({
  rows: [{ outlet_id: outletId, name: 'Moonlight Wellness', timezone: 'Asia/Kuala_Lumpur', onboarding_status: 'ready', access_status: 'active', stage: 'ready', owner_assigned: true, business_details: true, operating_hours: true, bookable_services: true, staff_configured: true, booking_path: true, first_real_booking: true, configuration_ready: true, missing_requirements: [], updated_at: timestamp }],
  total: 1,
  staff_requirement: 'optional',
});
platformStep2Service.integrations = async () => ({ rows: [{ outlet_id: outletId, outlet_name: 'Moonlight Wellness', integration_type: 'public_booking', state: 'configured', last_verified_success: timestamp, latest_error_at: null, latest_error: null, detail: 'Public booking route verified.' }], total: 1 });
platformStep2Service.jobs = async () => ({ rows: [{ reference_id: 'op-1042', outlet_id: outletId, outlet_name: 'Moonlight Wellness', job_type: 'booking_sync', state: 'succeeded', started_at: timestamp, completed_at: timestamp, attempt_count: 1, error: null }], total: 1, retries_enabled: false, scheduler_instrumentation: 'available' });
platformStep2Service.supportCases = async () => ({ rows: [{ id: 'case-1042', outlet_id: outletId, outlet_name: 'Moonlight Wellness', category: 'operations', priority: 'normal', subject: 'Booking page assistance', status: 'open', assigned_to: 'operator-1', assigned_name: 'Platform Operator', resolution_summary: null, created_at: timestamp, updated_at: timestamp, resolved_at: null }], total: 1 });
auditService.getPage = async () => ({ events: [{ id: 'audit-1042', outletId, action: 'remote access validated', affectedTarget: 'Moonlight Wellness', actor: 'Platform Operator', timestamp, outcome: 'succeeded', reason: 'Support investigation' }], total: 1, page: 1, pageSize: 25 });
platformOperationsService.getBillingReadiness = async () => ({ state: 'configured_unverified', provider: 'stripe', subscriptionDataAvailable: true, subscriptionCount: 1, webhook: 'unverified', checkoutReady: false, portalReady: false, checkedAt: timestamp, detail: 'Billing provider is configured for read-only evidence.' });

const InspectButton = () => {
  const { openOutletInspector } = useOutletInspector();
  return <button type="button" className="rounded-ui-md bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white" onClick={() => openOutletInspector(outletId)}>Inspect current outlet</button>;
};

const Harness = () => (
  <div className="min-h-screen overflow-x-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)]">
    <header className="sticky top-0 z-30 flex min-w-0 items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--bg-surface)] px-3 py-3 sm:px-6">
      <div className="min-w-0">
        <p className="truncate text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Bookglow platform</p>
        <h1 className="truncate text-lg font-bold">Operations overview</h1>
      </div>
      <GlobalSuperAdminSearch />
    </header>
    <main className="mx-auto max-w-7xl space-y-6 p-3 sm:p-6">
      <section className="rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-5 shadow-ui-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Outlet attention</p>
        <h2 className="mt-2 text-2xl font-bold">Moonlight Wellness</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">This isolated visual harness verifies the shared global search and reusable outlet inspector without contacting a live backend.</p>
        <div className="mt-4"><InspectButton /></div>
      </section>
    </main>
  </div>
);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <OutletInspectorProvider><Harness /></OutletInspectorProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
