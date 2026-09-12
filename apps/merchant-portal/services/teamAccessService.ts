import { createBrowserSupabaseClient } from "@bookglow/supabase";
import type { MerchantRole } from "@bookglow/auth-contracts";

const client = () => createBrowserSupabaseClient(import.meta.env as unknown as Record<string, string | undefined>) as any;

export interface OutletAccount {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: MerchantRole;
  status: string;
  joinedAt: string | null;
}

async function functionError(data: unknown, error: { message?: string; context?: Response } | null, fallback: string): Promise<Error> {
  const payload = data as { error?: string } | null;
  if (payload?.error) return new Error(payload.error);
  try {
    const body = await error?.context?.clone?.().json();
    if (body?.error) return new Error(String(body.error));
  } catch {
    /* ignore unreadable function error bodies */
  }
  return new Error(error?.message || fallback);
}

export async function listOutletAccounts(outletId: string): Promise<OutletAccount[]> {
  const { data, error } = await client().functions.invoke("invite-outlet-member", {
    body: { action: "list", outletId },
  });
  if (error) throw await functionError(data, error, error.message || "Team accounts could not be loaded.");
  if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
  return ((data as { accounts?: OutletAccount[] })?.accounts || []) as OutletAccount[];
}

export async function inviteOutletAccount(outletId: string, email: string, role: Exclude<MerchantRole, "owner">) {
  const { data, error } = await client().functions.invoke("invite-outlet-member", {
    body: {
      outletId,
      email,
      role,
      redirectTo: `${window.location.origin}/auth/callback/merchant`,
    },
  });
  if (error) throw await functionError(data, error, error.message || "The invitation could not be sent.");
  if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
  return data;
}

export async function changeOutletAccountRole(id: string, role: Exclude<MerchantRole, "owner">) {
  const { error } = await client().rpc("change_outlet_member_role", { p_member_id: id, p_role: role });
  if (error) throw error;
}

export async function setOutletAccountStatus(id: string, status: "active" | "suspended" | "removed") {
  const { error } = await client().rpc("set_outlet_member_status", { p_member_id: id, p_status: status });
  if (error) throw error;
}
