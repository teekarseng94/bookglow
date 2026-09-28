import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getSession: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}));
vi.mock('@bookglow/supabase', () => ({
  createBrowserSupabaseClient: () => ({
    rpc: mocks.rpc,
    from: mocks.from,
    auth: { getSession: mocks.getSession },
  }),
}));
import { completeMerchantOnboarding, hasMerchantWorkspace, savePersonalProfile } from '../../services/merchantOnboardingService';
import { emptyOnboardingPayload } from '../../apps/merchant-onboarding/onboardingTypes';

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-one' } } } });
  mocks.eq.mockResolvedValue({ error: null });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.from.mockReturnValue({ update: mocks.update, select: vi.fn() });
  mocks.rpc.mockResolvedValue({ data: {}, error: null });
});

it('reuses the provisioning request after success and isolates another account', async () => {
  mocks.rpc.mockResolvedValue({ data: { outlet_id: 'outlet-one' }, error: null });
  const payload = {
    ...emptyOnboardingPayload(),
    accountType: 'create' as const,
    businessName: 'Test business',
    phoneE164: '+60123829709',
  };
  await completeMerchantOnboarding(payload);
  const first = mocks.rpc.mock.calls[0][1].p_request_id;
  expect(mocks.rpc.mock.calls[0][1].p_phone).toBe('+60123829709');
  await completeMerchantOnboarding(payload);
  expect(mocks.rpc.mock.calls[1][1].p_request_id).toBe(first);
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-two' } } } });
  await completeMerchantOnboarding(payload);
  expect(mocks.rpc.mock.calls[2][1].p_request_id).not.toBe(first);
});

it('recognizes existing workspaces and fails closed on lookup errors', async () => {
  mocks.rpc.mockResolvedValue({ data: { outlet_id: 'outlet-one' }, error: null });
  expect(await hasMerchantWorkspace()).toBe(true);
  mocks.rpc.mockResolvedValue({ data: { outlet_id: 'outlet-one', registration_pending: true }, error: null });
  expect(await hasMerchantWorkspace()).toBe(false);
  mocks.rpc.mockResolvedValue({ data: { state: 'no_workspace', outlet_id: null }, error: null });
  expect(await hasMerchantWorkspace()).toBe(false);
  mocks.rpc.mockResolvedValue({ error: new Error('Unavailable') });
  await expect(hasMerchantWorkspace()).rejects.toThrow('Unavailable');
});

it('writes full_name and E.164 phone onto the existing profiles row', async () => {
  await savePersonalProfile({ firstName: 'Desa', lastName: 'Petaling', phoneE164: '+60123829709' });
  expect(mocks.rpc).toHaveBeenCalledWith('ensure_identity_profiles');
  expect(mocks.from).toHaveBeenCalledWith('profiles');
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
    full_name: 'Desa Petaling',
    phone: '+60123829709',
  }));
  expect(mocks.eq).toHaveBeenCalledWith('id', 'user-one');
});
