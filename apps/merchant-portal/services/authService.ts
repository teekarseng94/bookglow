/**
 * Merchant portal authentication.
 * Firebase by default; Supabase Auth when VITE_AUTH_PROVIDER=supabase.
 */
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
  AuthError,
  onAuthStateChanged,
} from "firebase/auth";
import { resolveAuthProvider } from "@bookglow/shared-types";
import { createBrowserSupabaseClient } from "@bookglow/supabase";
import { auth } from "../firebase";

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

function useSupabaseAuth(): boolean {
  return resolveAuthProvider(viteEnv()) === "supabase";
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

export const login = async (credentials: LoginCredentials): Promise<PortalAuthUser> => {
  if (!credentials.email || !credentials.email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }
  if (!credentials.password || credentials.password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const email = credentials.email.trim().toLowerCase();
  const password = credentials.password;

  if (useSupabaseAuth()) {
    const sb = createBrowserSupabaseClient(viteEnv());
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(
        error.message.includes("Invalid login")
          ? "Invalid email or password.\n\n💡 Create the user in Supabase Auth, then insert public.users (uid, outlet_id, role)."
          : error.message
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
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return toPortalUser(userCredential.user);
  } catch (error: any) {
    console.error("Login error:", error);
    if (error.code) {
      throw new Error(getErrorMessage(error.code as string));
    }
    if (error.message) throw error;
    throw new Error("Login failed. Please check your connection and try again.");
  }
};

export const logout = async (): Promise<void> => {
  if (useSupabaseAuth()) {
    const sb = createBrowserSupabaseClient(viteEnv());
    const { error } = await sb.auth.signOut();
    if (error) throw new Error(error.message);
    return;
  }
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(getErrorMessage((error as AuthError).code));
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  if (useSupabaseAuth()) {
    const sb = createBrowserSupabaseClient(viteEnv());
    const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) throw new Error(error.message);
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new Error(getErrorMessage((error as AuthError).code));
  }
};

export const getCurrentUser = (): PortalAuthUser | null => {
  if (useSupabaseAuth()) {
    return null; // session is async; use onAuthStateChange
  }
  const u = auth.currentUser;
  return u ? toPortalUser(u) : null;
};

export const onAuthStateChange = (
  callback: (user: PortalAuthUser | null) => void
): (() => void) => {
  if (useSupabaseAuth()) {
    const sb = createBrowserSupabaseClient(viteEnv());
    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      callback(
        u
          ? toPortalUser({
              uid: u.id,
              email: u.email,
              user_metadata: u.user_metadata as { full_name?: string; name?: string },
            })
          : null
      );
    });
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      callback(
        u
          ? toPortalUser({
              uid: u.id,
              email: u.email,
              user_metadata: u.user_metadata as { full_name?: string; name?: string },
            })
          : null
      );
    });
    return () => data.subscription.unsubscribe();
  }

  return onAuthStateChanged(auth, (user: FirebaseUser | null) => {
    callback(user ? toPortalUser(user) : null);
  });
};

function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Invalid email address format.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact administrator.";
    case "auth/user-not-found":
      return "No account found with this email address.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/invalid-credential":
      return "Invalid email or password.";
    default:
      return `Authentication error: ${errorCode}`;
  }
}
