import { createBrowserSupabaseClient } from "@bookglow/supabase";
import type { MerchantAccessContext } from "@bookglow/auth-contracts";

const env = () => import.meta.env as unknown as Record<string, string | undefined>;

export async function resolveMerchantAccess(): Promise<MerchantAccessContext> {
  const { data, error } = await createBrowserSupabaseClient(env()).rpc("resolve_merchant_access" as never);
  if (error) throw error;
  const value = data as unknown as Record<string, string | null>;
  return { state: value.state as MerchantAccessContext["state"], outletId: value.outlet_id, role: value.role as MerchantAccessContext["role"], onboardingStatus: value.onboarding_status, accessStatus: value.access_status };
}

export function merchantAccessDestination(access: MerchantAccessContext): string {
  if (access.state === "platform_admin") return "/admin/dashboard";
  if (access.state === "active") return "/dashboard";
  if (access.state === "onboarding") return "/onboarding";
  if (access.state === "membership_suspended") return "/access/account-suspended";
  if (access.state === "outlet_suspended") return "/access/workspace-suspended";
  return "/access/no-workspace";
}
