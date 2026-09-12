import { createBrowserSupabaseClient } from '@bookglow/supabase';

const env = () => import.meta.env as unknown as Record<string, string | undefined>;
const client = () => createBrowserSupabaseClient(env());
export const isMerchantProviderEnabled = (provider: 'google' | 'facebook') =>
  (env()[`VITE_AUTH_${provider.toUpperCase()}_ENABLED`] ?? env()[`VITE_${provider.toUpperCase()}_AUTH_ENABLED`]) === 'true';

export async function getMerchantSession() {
  const { data, error } = await client().auth.getSession();
  if (error) throw error;
  return data.session;
}

export function merchantOAuthReturnError(): string {
  const params = [new URLSearchParams(window.location.search), new URLSearchParams(window.location.hash.slice(1))];
  const failure = params.find((value) => value.has('error') || value.has('error_description'));
  if (!failure) return '';
  return failure.get('error') === 'access_denied'
    ? 'Google sign-up was cancelled or access was denied. Try again or continue with email.'
    : 'Sign-up could not be completed. Please try again or continue with email.';
}

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
