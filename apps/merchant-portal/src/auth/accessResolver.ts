import { createBrowserSupabaseClient } from "@bookglow/supabase";
import type { MerchantAccessContext } from "@bookglow/auth-contracts";
import { hasCapability, MERCHANT_RETURN_PATH_KEY, validatedMerchantReturnPath } from "@bookglow/auth-contracts";

const env = () => import.meta.env as unknown as Record<string, string | undefined>;

export async function resolveMerchantAccess(): Promise<MerchantAccessContext> {
  const sb = createBrowserSupabaseClient(env());
  const { data, error } = await sb.rpc("resolve_merchant_access" as never);
  if (error) {
    const missingRpc = error.code === "PGRST202" || /could not find the function.*resolve_merchant_access/i.test(error.message);
    if (!missingRpc) throw error;
    return resolveLegacyMerchantAccess(sb as any);
  }
  const value = data as unknown as Record<string, string | null>;
  return { state: value.state as MerchantAccessContext["state"], outletId: value.outlet_id, role: value.role as MerchantAccessContext["role"], onboardingStatus: value.onboarding_status, accessStatus: value.access_status };
}

async function resolveLegacyMerchantAccess(sb: any): Promise<MerchantAccessContext> {
  const { data: adminData, error: adminError } = await sb.rpc("is_portal_platform_admin");
  if (!adminError && adminData === true) {
    return { state: "platform_admin", outletId: null, role: null, onboardingStatus: null, accessStatus: "active" };
  }

  const { data: sessionData, error: sessionError } = await sb.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Your merchant session has expired. Please sign in again.");

  const { data: profile, error: profileError } = await sb
    .from("users")
    .select("outlet_id,role")
    .eq("uid", userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.outlet_id) {
    return { state: "no_workspace", outletId: null, role: null, onboardingStatus: null, accessStatus: null };
  }

  const { data: outlet, error: outletError } = await sb
    .from("outlets")
    .select("is_active")
    .eq("outlet_id", profile.outlet_id)
    .maybeSingle();
  if (outletError) throw outletError;
  if (outlet && outlet.is_active === false) {
    return { state: "outlet_suspended", outletId: profile.outlet_id, role: legacyRole(profile.role), onboardingStatus: null, accessStatus: "suspended" };
  }

  return {
    state: "active",
    outletId: profile.outlet_id,
    role: legacyRole(profile.role),
    onboardingStatus: "complete",
    accessStatus: "active",
  };
}

function legacyRole(value: unknown): MerchantAccessContext["role"] {
  const role = String(value || "cashier").toLowerCase();
  if (role === "admin") return "owner";
  if (role === "manager") return "manager";
  return "cashier";
}

export function merchantAccessDestination(access: MerchantAccessContext, requestedPath?: string | null): string {
  if (access.state === "platform_admin") return "/admin/dashboard";
  if (access.state === "active") {
    const saved = validatedMerchantReturnPath(requestedPath ?? sessionStorage.getItem(MERCHANT_RETURN_PATH_KEY));
    sessionStorage.removeItem(MERCHANT_RETURN_PATH_KEY);
    if (saved && returnPathAllowed(saved, access.role)) return saved;
    return access.role === "cashier" ? "/pos" : "/dashboard";
  }
  if (access.state === "onboarding") return "/onboarding";
  if (access.state === "membership_suspended") return "/access/account-suspended";
  if (access.state === "outlet_suspended") return "/access/workspace-suspended";
  return "/access/no-workspace";
}

/** Convert an internal destination into this portal's HashRouter URL. */
export const merchantBrowserDestination = (destination: string) => `/#${destination}`;

function returnPathAllowed(path: string, role: MerchantAccessContext["role"]): boolean {
  if (path.startsWith("/pos")) return hasCapability(role, "pos.use");
  if (path.startsWith("/schedule") || path.startsWith("/appointments")) return hasCapability(role, "schedule.view");
  if (path.startsWith("/member")) return hasCapability(role, "members.view");
  if (path.startsWith("/sales-reports") || path.startsWith("/report")) return hasCapability(role, "reports.view");
  if (path.startsWith("/settings")) return hasCapability(role, "settings.view");
  if (path.startsWith("/staff")) return hasCapability(role, "staff.view");
  return path === "/dashboard" ? hasCapability(role, "dashboard.view") : role !== "cashier";
}
