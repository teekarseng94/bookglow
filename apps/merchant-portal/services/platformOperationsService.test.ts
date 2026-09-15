import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());
const invoke = vi.hoisted(() => vi.fn());

vi.mock('@bookglow/supabase', () => ({
  createBrowserSupabaseClient: () => ({ rpc, functions: { invoke } }),
}));

import { platformOperationsService } from './platformOperationsService';

describe('platformOperationsService monitoring reads', () => {
  beforeEach(() => {
    rpc.mockReset();
    invoke.mockReset();
  });

  it('loads System Health events from the sanitizing RPC instead of the raw table', async () => {
    rpc.mockResolvedValue({
      data: {
        rows: [{
          id: 'evt-1',
          service: 'google-business',
          severity: 'error',
          event_type: 'sync_failed',
          message: 'authorization=[REDACTED] failed',
          outlet_id: 'outlet-1',
          correlation_id: null,
          occurred_at: '2026-09-14T00:00:00Z',
        }],
        total: 1,
      },
      error: null,
    });

    const events = await platformOperationsService.listMonitoringEvents();

    expect(rpc).toHaveBeenCalledWith('platform_monitoring_events_page', { p_limit: 200, p_offset: 0 });
    expect(events).toEqual([{
      id: 'evt-1',
      service: 'google-business',
      severity: 'error',
      eventType: 'sync_failed',
      message: 'authorization=[REDACTED] failed',
      outletId: 'outlet-1',
      correlationId: null,
      occurredAt: '2026-09-14T00:00:00Z',
    }]);
    expect(events[0].message).not.toMatch(/whsec_|sk_live_|Bearer\s+[A-Za-z0-9._~+/-]/i);
  });

  it('starts HitPay checkout without a browser Stripe price id', async () => {
    invoke.mockResolvedValue({ data: { url: 'https://securecheckout.hit-pay.com/example' }, error: null });
    const url = await platformOperationsService.createCheckout('outlet-1');
    expect(invoke).toHaveBeenCalledWith('billing-admin', {
      body: expect.objectContaining({ action: 'create_checkout', outletId: 'outlet-1' }),
    });
    expect(url).toContain('hit-pay.com');
  });

  it('cancels a HitPay subscription through billing-admin', async () => {
    invoke.mockResolvedValue({ data: { success: true, status: 'canceled' }, error: null });
    await platformOperationsService.cancelSubscription('outlet-1');
    expect(invoke).toHaveBeenCalledWith('billing-admin', {
      body: { action: 'cancel_subscription', outletId: 'outlet-1' },
    });
  });
});
