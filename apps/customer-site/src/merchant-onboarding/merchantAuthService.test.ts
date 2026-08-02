import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock('@bookglow/supabase', () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
    },
  }),
}));

import {
  registerMerchantWithEmail,
  signInMerchantForOnboarding,
} from '../../services/merchantAuthService';

describe('merchant email authentication', () => {
  beforeEach(() => {
    mocks.signUp.mockReset();
    mocks.signInWithPassword.mockReset();
  });

  it('returns email confirmation to the customer-site signup route', async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { email: 'merchant@example.com' }, session: null }, error: null });

    await registerMerchantWithEmail(' Merchant@Example.com ', 'password123');

    expect(mocks.signUp).toHaveBeenCalledWith({
      email: 'merchant@example.com',
      password: 'password123',
      options: { emailRedirectTo: `${window.location.origin}/signup` },
    });
  });

  it('resumes onboarding by signing into the existing Auth account', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { email: 'merchant@example.com' }, session: {} }, error: null });

    await signInMerchantForOnboarding(' Merchant@Example.com ', 'password123');

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'merchant@example.com',
      password: 'password123',
    });
  });
});
