import { createBrowserSupabaseClient } from "@bookglow/supabase";

const viteEnv = () => import.meta.env as unknown as Record<string, string | undefined>;

export const accountAdminService = {
  changeRole: async (uid: string, role: string): Promise<void> => {
    const sb = createBrowserSupabaseClient(viteEnv());
    const { error } = await sb.from("users").update({ role } as any).eq("uid", uid);
    if (error) throw error;
  },

  removeFromOutlet: async (uid: string): Promise<void> => {
    const sb = createBrowserSupabaseClient(viteEnv());
    const { error } = await sb.from("users").update({ outlet_id: null } as any).eq("uid", uid);
    if (error) throw error;
  },

  transferOwnership: async (outletId: string, currentOwnerUid: string, newOwnerUid: string): Promise<void> => {
    const sb = createBrowserSupabaseClient(viteEnv());
    // Demote current owner to manager, promote new owner to admin
    const { error: err1 } = await sb.from("users").update({ role: "manager" } as any).eq("uid", currentOwnerUid);
    if (err1) throw err1;
    const { error: err2 } = await sb.from("users").update({ role: "admin" } as any).eq("uid", newOwnerUid);
    if (err2) throw err2;
  },

  // The following operations require server-side/service-role credentials to interact with Supabase Auth Admin APIs.
  // Exposing them in Vite/browser direct queries is insecure and disallowed.
  inviteAccount: async (email: string, role: string, outletId: string): Promise<void> => {
    throw new Error(
      "Unavailable: Inviting users requires secure backend access to the Supabase Auth Admin API (admin.inviteUserByEmail). A server RPC or Edge Function migration is required."
    );
  },

  resendInvitation: async (email: string): Promise<void> => {
    throw new Error(
      "Unavailable: Resending invitations requires secure access to Supabase Auth Admin APIs. An Edge Function migration is required."
    );
  },

  suspendAccount: async (uid: string): Promise<void> => {
    throw new Error(
      "Unavailable: Suspending accounts requires server-side access to Supabase Auth Admin APIs to disable user authentication. An Edge Function migration is required."
    );
  },

  reactivateAccount: async (uid: string): Promise<void> => {
    throw new Error(
      "Unavailable: Reactivating accounts requires server-side access to Supabase Auth Admin APIs to enable user authentication. An Edge Function migration is required."
    );
  },

  requirePasswordReset: async (uid: string): Promise<void> => {
    throw new Error(
      "Unavailable: Enforcing password resets requires backend access to Supabase Auth Admin APIs to trigger recovery flows. An Edge Function migration is required."
    );
  },

  revokeSessions: async (uid: string): Promise<void> => {
    throw new Error(
      "Unavailable: Revoking active sessions requires secure access to Supabase Auth Admin APIs (admin.signOut). An Edge Function migration is required."
    );
  }
};
