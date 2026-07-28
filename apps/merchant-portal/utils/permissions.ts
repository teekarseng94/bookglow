export type UserRole = "admin" | "manager" | "cashier";

export type PermissionAction =
  | "manage-settings"
  | "manage-staff"
  | "finance-view"
  | "delete-transaction"
  | "marketing-view"
  | "reports-view"
  | "account-management"
  | "remote-control";

export const rolePermissions: Record<
  UserRole,
  {
    tabs: string[];
    actions: Record<PermissionAction, boolean>;
  }
> = {
  admin: {
    tabs: [
      "dashboard",
      "schedule",
      "appointments",
      "pos",
      "member",
      "menu",
      "sales-reports",
      "transactions",
      "finance",
      "staff",
      "settings",
      "marketing",
      "report",
    ],
    actions: {
      "manage-settings": true,
      "manage-staff": true,
      "finance-view": true,
      "delete-transaction": true,
      "marketing-view": true,
      "reports-view": true,
      "account-management": true,
      "remote-control": true,
    },
  },
  manager: {
    tabs: [
      "schedule",
      "appointments",
      "pos",
      "member",
      "menu",
      "sales-reports",
      "transactions",
      "staff",
      "report",
    ],
    actions: {
      "manage-settings": false,
      "manage-staff": true,
      "finance-view": false,
      "delete-transaction": false,
      "marketing-view": false,
      "reports-view": true,
      "account-management": false,
      "remote-control": false,
    },
  },
  cashier: {
    tabs: ["pos", "member", "menu", "sales-reports"],
    actions: {
      "manage-settings": false,
      "manage-staff": false,
      "finance-view": false,
      "delete-transaction": false,
      "marketing-view": false,
      "reports-view": true,
      "account-management": false,
      "remote-control": false,
    },
  },
};

export function hasPermission(role: UserRole | null | undefined, action: PermissionAction): boolean {
  if (!role) return false;
  return rolePermissions[role]?.actions[action] ?? false;
}

export function isTabAllowed(role: UserRole | null | undefined, tabId: string): boolean {
  if (!role) return false;
  const normalized = tabId === 'appointments' ? 'schedule' : tabId;
  return rolePermissions[role]?.tabs.includes(normalized) ?? false;
}
