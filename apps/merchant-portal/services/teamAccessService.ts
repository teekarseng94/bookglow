import { createBrowserSupabaseClient } from "@bookglow/supabase";
import type { MerchantRole } from "@bookglow/auth-contracts";
const client = () => createBrowserSupabaseClient(import.meta.env as unknown as Record<string, string | undefined>) as any;
export interface OutletAccount { id: string; userId: string; name: string; email: string; role: MerchantRole; status: string; joinedAt: string | null; }
export async function listOutletAccounts(outletId: string): Promise<OutletAccount[]> {
  const { data, error } = await client().from("outlet_members").select("id,user_id,role,status,joined_at,profiles(full_name,email)").eq("outlet_id", outletId).order("created_at");
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: row.id, userId: row.user_id, name: row.profiles?.full_name || row.profiles?.email || "Account", email: row.profiles?.email || "", role: row.role, status: row.status, joinedAt: row.joined_at }));
}
export async function inviteOutletAccount(outletId: string, email: string, role: Exclude<MerchantRole,"owner">) {
  const { data, error } = await client().functions.invoke("invite-outlet-member", { body: { outletId, email, role, redirectTo: `${window.location.origin}/auth/callback/merchant` } });
  if (error) throw error; return data;
}
export async function changeOutletAccountRole(id: string, role: Exclude<MerchantRole,"owner">) { const { error } = await client().rpc("change_outlet_member_role", { p_member_id: id, p_role: role }); if (error) throw error; }
export async function setOutletAccountStatus(id: string, status: "active"|"suspended"|"removed") { const { error } = await client().rpc("set_outlet_member_status", { p_member_id: id, p_status: status }); if (error) throw error; }
