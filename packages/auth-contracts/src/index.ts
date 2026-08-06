export type MerchantRole = "owner" | "admin" | "manager" | "cashier";

export type MerchantCapability =
  | "dashboard.view" | "schedule.view" | "schedule.manage" | "pos.use"
  | "members.view" | "members.manage" | "catalog.view" | "catalog.manage"
  | "staff.view" | "staff.manage" | "reports.view" | "settings.view"
  | "settings.manage" | "accounts.view" | "accounts.invite"
  | "accounts.change_role" | "accounts.suspend"
  | "outlet.transfer_ownership" | "outlet.archive";

const ALL: MerchantCapability[] = [
  "dashboard.view", "schedule.view", "schedule.manage", "pos.use", "members.view",
  "members.manage", "catalog.view", "catalog.manage", "staff.view", "staff.manage",
  "reports.view", "settings.view", "settings.manage", "accounts.view", "accounts.invite",
  "accounts.change_role", "accounts.suspend", "outlet.transfer_ownership", "outlet.archive",
];

export const ROLE_CAPABILITIES: Readonly<Record<MerchantRole, readonly MerchantCapability[]>> = {
  owner: ALL,
  admin: ALL.filter((c) => c !== "outlet.transfer_ownership" && c !== "outlet.archive"),
  manager: ["dashboard.view", "schedule.view", "schedule.manage", "pos.use", "members.view", "members.manage", "catalog.view", "catalog.manage", "staff.view", "staff.manage", "reports.view", "settings.view"],
  cashier: ["pos.use", "members.view", "catalog.view", "reports.view"],
};

export const hasCapability = (role: MerchantRole | null | undefined, capability: MerchantCapability) =>
  !!role && ROLE_CAPABILITIES[role].includes(capability);

export const CUSTOMER_RETURN_PATH_KEY = "bookglow.customer.return_path";
export const CUSTOMER_BOOKING_DRAFT_KEY = "bookglow.customer.booking_draft";
export const MERCHANT_AUTH_INTENT_KEY = "bookglow.merchant.auth_intent";
export const MERCHANT_PROVISION_REQUEST_KEY = "bookglow.merchant.provision_request_id";

export function validatedCustomerReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/book/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/";
  try {
    const parsed = new URL(value, "https://bookglow.invalid");
    return parsed.origin === "https://bookglow.invalid" && parsed.pathname.startsWith("/book/")
      ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/";
  } catch { return "/"; }
}

export type MerchantAccessState = "platform_admin" | "active" | "onboarding" | "membership_suspended" | "outlet_suspended" | "no_workspace";
export interface MerchantAccessContext {
  state: MerchantAccessState;
  outletId: string | null;
  role: MerchantRole | null;
  onboardingStatus: string | null;
  accessStatus: string | null;
}
