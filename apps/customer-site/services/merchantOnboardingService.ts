import { createBrowserSupabaseClient } from '@bookglow/supabase';
import { merchantLoginHref } from '../src/merchantPortalUrl';
import type { MerchantOnboardingPayload, OnboardingDraft, OnboardingStepId } from '../apps/merchant-onboarding/onboardingTypes';
import { composeFullName, isGoogleAuthProvider, namesFromAuthMetadata } from '../apps/merchant-onboarding/personalDetails';
import { MERCHANT_PROVISION_REQUEST_KEY } from '@bookglow/auth-contracts';

const client = () => createBrowserSupabaseClient(import.meta.env as unknown as Record<string, string | undefined>);

export async function hasMerchantWorkspace(): Promise<boolean> {
  const { data, error } = await client().rpc('resolve_merchant_access' as never);
  if (error) throw error;
  const value = data as unknown as { outlet_id?: string | null; registration_pending?: boolean | string } | null;
  if (value?.registration_pending === true || value?.registration_pending === 'true') return false;
  return Boolean(value?.outlet_id);
}

export async function ensureMerchantWorkspace(): Promise<void> {
  const { error } = await client().rpc('ensure_merchant_workspace' as never);
  if (!error) return;
  const missingRpc = error.code === 'PGRST202' || /could not find the function.*ensure_merchant_workspace/i.test(error.message);
  if (!missingRpc) throw error;
}

export async function loadMerchantIdentity(): Promise<{
  firstName: string;
  lastName: string;
  phone: string | null;
  isGoogle: boolean;
}> {
  const session = (await client().auth.getSession()).data.session;
  const meta = (session?.user.user_metadata || {}) as Record<string, unknown>;
  const fromMeta = namesFromAuthMetadata(meta);
  const identities = (session?.user.identities || []) as Array<{ provider?: string }>;
  let firstName = fromMeta.firstName;
  let lastName = fromMeta.lastName;
  let phone: string | null = typeof meta.phone === 'string' ? meta.phone : null;
  if (session) {
    const { data } = await client().from('profiles' as never).select('full_name,phone').eq('id', session.user.id).maybeSingle();
    const row = data as { full_name?: string | null; phone?: string | null } | null;
    if (row?.full_name && !firstName) {
      const split = namesFromAuthMetadata({ full_name: row.full_name });
      firstName = split.firstName;
      lastName = lastName || split.lastName;
    }
    if (row?.phone) phone = row.phone;
  }
  return { firstName, lastName, phone, isGoogle: isGoogleAuthProvider(identities) };
}

export async function savePersonalProfile(input: {
  firstName: string;
  lastName: string;
  phoneE164: string;
}): Promise<void> {
  const session = (await client().auth.getSession()).data.session;
  if (!session) throw new Error('Your session expired. Sign in again to continue.');
  await client().rpc('ensure_identity_profiles' as never);
  const fullName = composeFullName(input.firstName, input.lastName);
  const { error } = await client()
    .from('profiles' as never)
    .update({
      full_name: fullName,
      phone: input.phoneE164,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', session.user.id);
  if (error) throw error;
}

export async function loadMerchantDraft(): Promise<OnboardingDraft | null> {
  const { data, error } = await client().from('merchant_onboarding_drafts' as never).select('*').maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as Record<string, unknown>;
  return { currentStep: row.current_step as OnboardingStepId, accountType: row.account_type as OnboardingDraft['accountType'], payload: row.payload as MerchantOnboardingPayload, completedAt: row.completed_at as string | null };
}

export async function saveMerchantDraft(currentStep: OnboardingStepId, payload: MerchantOnboardingPayload) {
  const session = (await client().auth.getSession()).data.session;
  if (!session) throw new Error('Your session expired. Sign in again to continue.');
  const { error } = await client().from('merchant_onboarding_drafts' as never).upsert({
    auth_user_id: session.user.id, current_step: currentStep, account_type: payload.accountType || null,
    payload, updated_at: new Date().toISOString(),
  } as never, { onConflict: 'auth_user_id' });
  if (error) throw error;
}

export async function completeMerchantOnboarding(payload: MerchantOnboardingPayload) {
  if (payload.accountType !== 'create') {
    throw new Error('Joining an existing business requires a verified invitation.');
  }
  const session = (await client().auth.getSession()).data.session;
  if (!session) throw new Error('Your session expired. Sign in again to continue.');
  const requestKey = `${MERCHANT_PROVISION_REQUEST_KEY}:${session.user.id}`;
  let requestId = sessionStorage.getItem(requestKey);
  if (!requestId) { requestId = crypto.randomUUID(); sessionStorage.setItem(requestKey, requestId); }
  const businessType = payload.primaryBusinessCategory || payload.businessCategories?.[0] || 'other';
  const phone = payload.phoneE164 || null;
  const { data, error } = await client().rpc('create_merchant_workspace' as never, {
    p_request_id: requestId, p_business_name: payload.businessName, p_business_type: businessType, p_phone: phone,
  } as never);
  if (error) throw error;
  // Retain the per-user request ID: refresh/retry must reuse the successful RPC.
  return data as unknown as { outlet_id: string; booking_slug: string; idempotent: boolean };
}

export async function acceptMerchantInvitation(token: string) {
  const { data, error } = await client().rpc('accept_outlet_invitation' as never, { invitation_token: token.trim() } as never);
  if (error) throw error;
  return data as unknown as { outlet_id: string; role: string };
}

export function merchantPortalLoginUrl(email?: string): string {
  return merchantLoginHref({ onboarding: 'complete', ...(email ? { email } : {}) });
}
