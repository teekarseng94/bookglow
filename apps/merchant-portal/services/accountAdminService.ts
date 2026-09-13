import { createBrowserSupabaseClient } from "@bookglow/supabase";

const viteEnv = () => import.meta.env as unknown as Record<string, string | undefined>;

export type WorkspaceAccountRole = "admin" | "manager" | "cashier";

export interface UnlinkedAuthAccount {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
}

const invokeAccountAdmin = async <T>(body: Record<string, unknown>): Promise<T> => {
  const sb = createBrowserSupabaseClient(viteEnv());
  const { data, error } = await sb.functions.invoke("account-admin", { body });
  if (error) throw new Error((data as any)?.error || error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
};

const invokeTrackedAccountAction = async <T>(body: Record<string, unknown>): Promise<T> =>
  invokeAccountAdmin<T>({ ...body, operationId: crypto.randomUUID() });

const invokePlatformRpc = async <T>(name: string, args: Record<string, unknown>): Promise<T> => {
  const sb = createBrowserSupabaseClient(viteEnv());
  const { data, error } = await (sb as any).rpc(name, args);
  if (error) throw error;
  return data as T;
};

export const accountAdminService = {
  changeRole: async (outletId: string, uid: string, role: string, reason?: string): Promise<void> => {
    await invokePlatformRpc("platform_manage_outlet_member", {
      p_outlet_id: outletId, p_user_id: uid, p_action: "change_role", p_role: role, p_reason: reason || null,
    });
  },

  removeFromOutlet: async (outletId: string, uid: string, reason: string): Promise<void> => {
    await invokePlatformRpc("platform_manage_outlet_member", {
      p_outlet_id: outletId, p_user_id: uid, p_action: "remove_membership", p_role: null, p_reason: reason,
    });
  },

  setMembershipStatus: async (outletId: string, uid: string, active: boolean, reason: string): Promise<void> => {
    await invokePlatformRpc("platform_manage_outlet_member", {
      p_outlet_id: outletId,
      p_user_id: uid,
      p_action: active ? "reactivate_membership" : "suspend_membership",
      p_role: null,
      p_reason: reason,
    });
  },

  transferOwnership: async (outletId: string, currentOwnerUid: string, newOwnerUid: string, reason: string): Promise<void> => {
    await invokePlatformRpc("platform_transfer_outlet_ownership", {
      p_outlet_id: outletId, p_current_owner: currentOwnerUid, p_new_owner: newOwnerUid, p_reason: reason,
    });
  },

  // The following operations require server-side/service-role credentials to interact with Supabase Auth Admin APIs.
  // Exposing them in Vite/browser direct queries is insecure and disallowed.
  listUnlinkedAccounts: async (): Promise<UnlinkedAuthAccount[]> => {
    const result = await invokeAccountAdmin<{ accounts: UnlinkedAuthAccount[] }>({ action: "list_unlinked" });
    return result.accounts || [];
  },

  linkRegisteredAccount: async (
    userId: string,
    outletId: string,
    role: WorkspaceAccountRole,
  ): Promise<void> => {
    await invokeAccountAdmin({ action: "link_registered", userId, outletId, role });
  },

  inviteAccount: async (email: string, role: string, outletId: string): Promise<void> => {
    await invokeAccountAdmin({ action: "invite", email, role, outletId });
  },

  resendInvitation: async (uid: string): Promise<void> => {
    await invokeTrackedAccountAction({ action: "resend_invitation", userId: uid });
  },

  suspendAccount: async (uid: string, reason: string): Promise<void> => {
    await invokeTrackedAccountAction({ action: "suspend_global", userId: uid, reason });
  },

  reactivateAccount: async (uid: string, reason?: string): Promise<void> => {
    await invokeTrackedAccountAction({ action: "reactivate_global", userId: uid, reason });
  },

  requirePasswordReset: async (uid: string): Promise<void> => {
    await invokeTrackedAccountAction({ action: "start_password_recovery", userId: uid, redirectTo: `${window.location.origin}/login` });
  },

  revokeSessions: async (uid: string, reason?: string): Promise<void> => {
    await invokeTrackedAccountAction({ action: "revoke_bookglow_access", userId: uid, reason });
  }
};
