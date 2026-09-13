import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ error: null as Error | null, rows: [] as any[], count: 0 }));
const query = vi.hoisted(() => {
  const api: any = {};
  for (const method of ['select', 'eq', 'ilike', 'gte', 'lte', 'or', 'order']) api[method] = vi.fn(() => api);
  api.range = vi.fn(() => Promise.resolve({ data: state.rows, error: state.error, count: state.count }));
  return api;
});
const rpc = vi.hoisted(() => vi.fn());

vi.mock('@bookglow/supabase', () => ({ createBrowserSupabaseClient: () => ({ from: () => query, rpc }) }));
import { auditService } from './auditService';

describe('auditService', () => {
  beforeEach(() => { state.error = null; state.rows = []; state.count = 0; rpc.mockReset(); query.range.mockClear(); });

  it('returns authoritative server records with pagination totals', async () => {
    state.count = 137;
    state.rows = [{ id: 'event-1', outlet_id: 'outlet-1', action: 'portal suspended', affected_target: 'Outlet', actor_email: 'admin@example.com', occurred_at: '2026-09-14T00:00:00Z', outcome: 'succeeded' }];
    const result = await auditService.getPage({ page: 2, pageSize: 50 });
    expect(result.total).toBe(137);
    expect(result.events[0].actor).toBe('admin@example.com');
    expect(query.range).toHaveBeenCalledWith(50, 99);
  });

  it('surfaces server audit failures instead of returning browser-local history', async () => {
    state.error = new Error('audit unavailable');
    await expect(auditService.getAllEvents()).rejects.toThrow('audit unavailable');
  });

  it('does not swallow an audit write failure', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('write rejected') });
    await expect(auditService.logEvent('outlet-1', 'test', 'target', 'ignored')).rejects.toThrow('write rejected');
  });
});
