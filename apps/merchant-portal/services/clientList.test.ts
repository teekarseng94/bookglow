import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => {
  const api: Record<string, unknown> = {};
  const self = () => api;
  api.select = vi.fn(self);
  api.eq = vi.fn(self);
  api.order = vi.fn(self);
  api.range = vi.fn(self);
  api.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({
      data: [],
      error: null,
      count: query.count,
    }).then(resolve);
  return api as {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    range: ReturnType<typeof vi.fn>;
    count: number;
    then: (resolve: (value: unknown) => unknown) => Promise<unknown>;
  };
});

vi.mock('@bookglow/supabase', () => ({
  createBrowserSupabaseClient: () => ({ from: () => query }),
}));

vi.mock('@bookglow/shared-types', () => ({
  resolveDataProvider: () => 'supabase',
}));

import { clientService, DEFAULT_LIST_PAGE_SIZE, setCurrentOutletID } from './databaseService';

describe('clientService member list', () => {
  beforeEach(() => {
    query.count = 137;
    query.select.mockClear();
    query.eq.mockClear();
    query.order.mockClear();
    query.range.mockClear();
    setCurrentOutletID('outlet-sohokaki');
  });

  it('counts members for the current outlet without loading rows', async () => {
    await expect(clientService.count('outlet-sohokaki')).resolves.toBe(137);
    expect(query.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(query.eq).toHaveBeenCalledWith('outlet_id', 'outlet-sohokaki');
  });

  it('keeps the first page at DEFAULT_LIST_PAGE_SIZE and still scopes by outlet', async () => {
    await clientService.listPage('outlet-baliwellness', { limit: DEFAULT_LIST_PAGE_SIZE, offset: 0 });
    expect(query.eq).toHaveBeenCalledWith('outlet_id', 'outlet-baliwellness');
    expect(query.range).toHaveBeenCalledWith(0, DEFAULT_LIST_PAGE_SIZE - 1);
    expect(DEFAULT_LIST_PAGE_SIZE).toBe(50);
  });
});
