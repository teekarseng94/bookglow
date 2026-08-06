/**
 * Merchant portal authentication — Supabase Auth only (Phase D).
 * Auth state uses a single shared subscription multiplexed to listeners.
 */
import { createBrowserSupabaseClient } from "@bookglow/supabase";

export interface LoginCredentials {
  email: string;
  password: string;
}

/** Provider-agnostic auth user for portal UI. */
export type PortalAuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

function viteEnv(): Record<string, string | undefined> {
  return import.meta.env as unknown as Record<string, string | undefined>;
}

function toPortalUser(user: {
  uid?: string;
  id?: string;
  email?: string | null;
  displayName?: string | null;
  user_metadata?: { full_name?: string; name?: string };
}): PortalAuthUser {
  return {
    uid: user.uid || user.id || "",
    email: user.email ?? null,
    displayName:
      user.displayName ??
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      null,
  };
}

type AuthListener = (user: PortalAuthUser | null) => void;

let sharedUnsubscribe: (() => void) | null = null;
let sharedListeners = new Set<AuthListener>();
let lastUser: PortalAuthUser | null | undefined = undefined;
let sessionPrimed = false;

function notifyListeners(user: PortalAuthUser | null) {
  lastUser = user;
  sharedListeners.forEach((listener) => {
    try {
      listener(user);
    } catch (err) {
      console.error("Auth listener error:", err);
    }
  });
}

function ensureSharedAuthSubscription() {
  if (sharedUnsubscribe) return;
  const sb = createBrowserSupabaseClient(viteEnv());

  sb.auth.getSession().then(({ data }) => {
    const u = data.session?.user;
    sessionPrimed = true;
    notifyListeners(
      u
        ? toPortalUser({
            uid: u.id,
            email: u.email,
            user_metadata: u.user_metadata as { full_name?: string; name?: string },
          })
        : null,
    );
  });

  const { data } = sb.auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    notifyListeners(
      u
        ? toPortalUser({
            uid: u.id,
            email: u.email,
            user_metadata: u.user_metadata as { full_name?: string; name?: string },
          })
        : null,
    );
  });

  sharedUnsubscribe = () => {
    data.subscription.unsubscribe();
    sharedUnsubscribe = null;
    sessionPrimed = false;
    lastUser = undefined;
  };
}

export const login = async (credentials: LoginCredentials): Promise<PortalAuthUser> => {
  if (!credentials.email || !credentials.email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }
  if (!credentials.password || credentials.password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const email = credentials.email.trim().toLowerCase();
  const password = credentials.password;
  const sb = createBrowserSupabaseClient(viteEnv());
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(
      error.message.includes("Invalid login")
        ? "Invalid email or password."
        : error.message,
    );
  }
  if (!data.user) throw new Error("Login failed.");
  return toPortalUser({
    uid: data.user.id,
    email: data.user.email,
    user_metadata: data.user.user_metadata as {
      full_name?: string;
      name?: string;
    },
  });
};

export const logout = async (): Promise<void> => {
  const sb = createBrowserSupabaseClient(viteEnv());
  const { error } = await sb.auth.signOut();
  if (error) throw new Error(error.message);
};

export const resetPassword = async (email: string): Promise<void> => {
  const sb = createBrowserSupabaseClient(viteEnv());
  const redirectTo =
    viteEnv().VITE_MERCHANT_AUTH_CALLBACK_URL ||
    `${window.location.origin}/auth/callback/merchant`;
  const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });
  if (error) throw new Error(error.message);
};

export const isMerchantOAuthEnabled = (provider: "google" | "facebook") =>
  viteEnv()[`VITE_AUTH_${provider.toUpperCase()}_ENABLED`] === "true";

export async function loginWithOAuth(provider: "google" | "facebook") {
  if (!isMerchantOAuthEnabled(provider)) {
    throw new Error(
      `${provider === "google" ? "Google" : "Facebook"} sign-in is not available yet. Please continue with email.`,
    );
  }
  sessionStorage.setItem("bookglow.merchant.auth_intent", "login");
  const redirectTo =
    viteEnv().VITE_MERCHANT_AUTH_CALLBACK_URL ||
    `${window.location.origin}/auth/callback/merchant`;
  const { error } = await createBrowserSupabaseClient(viteEnv()).auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error) {
    throw new Error(
      error.message.toLowerCase().includes("provider")
        ? "Google sign-in is not available yet. Please continue with email."
        : "Merchant sign-in failed. Please try again.",
    );
  }
}

export const getCurrentUser = (): PortalAuthUser | null => {
  return lastUser ?? null;
};

/**
 * Subscribe to auth state. Multiple React trees share one Supabase auth listener.
 */
export const onAuthStateChange = (callback: AuthListener): (() => void) => {
  ensureSharedAuthSubscription();
  sharedListeners.add(callback);

  if (sessionPrimed && lastUser !== undefined) {
    callback(lastUser);
  }

  return () => {
    sharedListeners.delete(callback);
    if (sharedListeners.size === 0 && sharedUnsubscribe) {
      sharedUnsubscribe();
    }
  };
};
