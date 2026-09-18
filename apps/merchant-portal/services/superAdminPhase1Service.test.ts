import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('@bookglow/supabase', () => ({ createBrowserSupabaseClient: () => ({ rpc }) }));

import { mapGlobalSearchResult, superAdminPhase1Service } from './superAdminPhase1Service';

describe('superAdminPhase1Service', () => {
  beforeEach(() => rpc.mockReset());

  it('uses the platform-admin search RPC and never performs browser-side table scans', async () => {
    rpc.mockResolvedValue({
      data: { results: [{ entity_type: 'booking', entity_id: 'bk-100', title: 'Booking bk-100', matched_text: 'bk-100', outlet_id: 'outlet-1', outlet_name: 'Bali', status: 'scheduled', occurred_at: '2026-09-18T00:00:00Z' }] },
      error: null,
    });
    await expect(superAdminPhase1Service.search('bk-1')).resolves.toHaveLength(1);
    expect(rpc).toHaveBeenCalledWith('platform_global_search', { p_query: 'bk-1', p_limit_per_group: 5 });
  });

  it('allow-lists suggestion fields and drops sensitive or unknown payload data', () => {
    const result = mapGlobalSearchResult({
      entity_type: 'sale', entity_id: 'sale-1', title: 'Sale sale-1', matched_text: 'sale-1',
      outlet_id: 'outlet-1', outlet_name: 'Bali', status: 'paid', occurred_at: null,
      provider_payload: { card_number: '4111111111111111' }, access_token: 'secret', internal_notes: 'private',
    });
    expect(result).toEqual({ type: 'sale', id: 'sale-1', title: 'Sale sale-1', matchedText: 'sale-1', outletId: 'outlet-1', outletName: 'Bali', status: 'paid', timestamp: null });
    expect(JSON.stringify(result)).not.toMatch(/411111|secret|private|provider_payload|access_token|internal_notes/);
  });

  it('rejects unknown result types and avoids RPC calls for short queries', async () => {
    expect(mapGlobalSearchResult({ entity_type: 'provider_secret', entity_id: '1', title: 'Nope' })).toBeNull();
    await expect(superAdminPhase1Service.search('a')).resolves.toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });
});

