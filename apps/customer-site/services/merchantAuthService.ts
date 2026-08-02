import { createBrowserSupabaseClient } from '@bookglow/supabase';

const env = () => import.meta.env as unknown as Record<string, string | undefined>;
const client = () => createBrowserSupabaseClient(env());
export const isMerchantProviderEnabled = (provider: 'google' | 'facebook') =>
  env()[`VITE_${provider.toUpperCase()}_AUTH_ENABLED`] === 'true';

export async function getMerchantSession() { return (await client().auth.getSession()).data.session; }

export async function registerMerchantWithEmail(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await client().auth.signUp({
    email: normalized,
    password,
    options: { emailRedirectTo: `${window.location.origin}/signup` },
  });
  if (error) throw error;
  return { user: data.user, session: data.session, confirmationRequired: !data.session };
}

export async function signInMerchantForOnboarding(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await client().auth.signInWithPassword({ email: normalized, password });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function registerMerchantWithProvider(provider: 'google' | 'facebook') {
  if (!isMerchantProviderEnabled(provider)) throw new Error(`${provider === 'google' ? 'Google' : 'Facebook'} sign-up is not configured yet.`);
  const { error } = await client().auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/signup` },
  });
  if (error) throw error;
}

export async function signOutMerchantSignup() { await client().auth.signOut(); }

export function merchantAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Account creation failed.';
  const lower = message.toLowerCase();
  if (lower.includes('already registered')) return 'This email is already registered. Choose Merchant login instead.';
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) return 'The email or password is incorrect.';
  if (lower.includes('password')) return 'Use a stronger password with at least 8 characters.';
  if (lower.includes('provider') || lower.includes('not enabled')) return 'That sign-up provider is unavailable. Continue with email.';
  return message;
}
