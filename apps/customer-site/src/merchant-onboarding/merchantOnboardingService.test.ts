import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getSession: vi.fn() }));
vi.mock('@bookglow/supabase', () => ({ createBrowserSupabaseClient: () => ({ rpc: mocks.rpc, auth: { getSession: mocks.getSession } }) }));
import { completeMerchantOnboarding, hasMerchantWorkspace } from '../../services/merchantOnboardingService';
import { emptyOnboardingPayload } from '../../apps/merchant-onboarding/onboardingTypes';
beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear(); mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-one' } } } }); });
it('reuses the provisioning request after success and isolates another account', async () => {
  mocks.rpc.mockResolvedValue({ data: { outlet_id: 'outlet-one' }, error: null });
  const payload = { ...emptyOnboardingPayload(), accountType: 'create' as const, businessName: 'Test business' };
  await completeMerchantOnboarding(payload);
  const first = mocks.rpc.mock.calls[0][1].p_request_id;
  await completeMerchantOnboarding(payload);
  expect(mocks.rpc.mock.calls[1][1].p_request_id).toBe(first);
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-two' } } } });
  await completeMerchantOnboarding(payload);
  expect(mocks.rpc.mock.calls[2][1].p_request_id).not.toBe(first);
});
it('recognizes existing workspaces and fails closed on lookup errors', async () => {
  mocks.rpc.mockResolvedValue({ data: { outlet_id: 'outlet-one' }, error: null });
  expect(await hasMerchantWorkspace()).toBe(true);
  mocks.rpc.mockResolvedValue({ data: { state: 'no_workspace', outlet_id: null }, error: null });
  expect(await hasMerchantWorkspace()).toBe(false);
  mocks.rpc.mockResolvedValue({ error: new Error('Unavailable') });
  await expect(hasMerchantWorkspace()).rejects.toThrow('Unavailable');
});
