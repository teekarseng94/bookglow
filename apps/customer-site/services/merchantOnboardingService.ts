import { createBrowserSupabaseClient } from '@bookglow/supabase';
import type { MerchantOnboardingPayload, OnboardingDraft, OnboardingStepId } from '../apps/merchant-onboarding/onboardingTypes';

const client = () => createBrowserSupabaseClient(import.meta.env as unknown as Record<string, string | undefined>);

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
  const { data, error } = await client().rpc('complete_merchant_onboarding' as never, { payload } as never);
  if (error) throw error;
  return data as unknown as { outlet_id: string; booking_slug: string; idempotent: boolean };
}

export async function acceptMerchantInvitation(token: string) {
  const { data, error } = await client().rpc('accept_outlet_invitation' as never, { invitation_token: token.trim() } as never);
  if (error) throw error;
  return data as unknown as { outlet_id: string; role: string };
}

export function merchantPortalLoginUrl(email?: string): string {
  const base = (import.meta.env as unknown as Record<string, string | undefined>).VITE_MERCHANT_PORTAL_URL || 'http://localhost:5173';
  const url = new URL('/login', base);
  url.searchParams.set('onboarding', 'complete');
  if (email) url.searchParams.set('email', email);
  return url.toString();
}
