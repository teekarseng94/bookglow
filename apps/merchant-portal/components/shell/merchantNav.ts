import { isTabAllowed, type UserRole } from '../../utils/permissions';

export type MerchantNavId =
  | 'dashboard'
  | 'schedule'
  | 'pos'
  | 'member'
  | 'menu'
  | 'sales-reports'
  | 'transactions'
  | 'finance'
  | 'marketing'
  | 'staff'
  | 'integrations'
  | 'settings'
  | 'report';

export type MerchantNavIcon =
  | 'Dashboard'
  | 'Calendar'
  | 'POS'
  | 'Clients'
  | 'Services'
  | 'Reports'
  | 'Finance'
  | 'Marketing'
  | 'Staff'
  | 'Integrations'
  | 'Settings'
  | 'Flag';

export type MerchantNavGroup = 'Workday' | 'Customers' | 'Business' | 'Workspace';

export type MerchantNavDefinition = {
  id: MerchantNavId;
  label: string;
  shortLabel?: string;
  icon: MerchantNavIcon;
  group: MerchantNavGroup;
};

/** Single source of truth for sidebar, bottom nav, and the More sheet. */
export const MERCHANT_NAV_CATALOG: readonly MerchantNavDefinition[] = [
  { id: 'dashboard', label: 'Today', icon: 'Dashboard', group: 'Workday' },
  { id: 'schedule', label: 'Schedule', icon: 'Calendar', group: 'Workday' },
  { id: 'pos', label: 'Point of Sale', shortLabel: 'POS', icon: 'POS', group: 'Workday' },
  { id: 'member', label: 'Members', icon: 'Clients', group: 'Customers' },
  { id: 'marketing', label: 'Marketing', icon: 'Marketing', group: 'Customers' },
  { id: 'menu', label: 'Menu & Inventory', shortLabel: 'Menu', icon: 'Services', group: 'Business' },
  { id: 'sales-reports', label: 'Sales Reports', shortLabel: 'Reports', icon: 'Reports', group: 'Business' },
  { id: 'transactions', label: 'Sales History', icon: 'Finance', group: 'Business' },
  { id: 'finance', label: 'Finance', icon: 'Finance', group: 'Business' },
  { id: 'staff', label: 'Staff & Team', icon: 'Staff', group: 'Business' },
  { id: 'integrations', label: 'Integrations', icon: 'Integrations', group: 'Workspace' },
  { id: 'settings', label: 'Settings', icon: 'Settings', group: 'Workspace' },
  { id: 'report', label: 'Report', icon: 'Flag', group: 'Workspace' },
] as const;

export const MERCHANT_NAV_GROUP_ORDER: readonly MerchantNavGroup[] = [
  'Workday',
  'Customers',
  'Business',
  'Workspace',
];

export const MOBILE_PRIMARY_NAV: Record<UserRole, readonly MerchantNavId[]> = {
  admin: ['dashboard', 'schedule', 'pos', 'member'],
  manager: ['schedule', 'pos', 'member', 'staff'],
  cashier: ['pos', 'member', 'menu', 'sales-reports'],
};

export const MERCHANT_PAGE_TITLES: Record<string, string> = {
  dashboard: 'Today',
  pos: 'Point of Sale',
  schedule: 'Schedule',
  appointments: 'Schedule',
  member: 'Members',
  menu: 'Menu & Inventory',
  'sales-reports': 'Sales Reports',
  transactions: 'Sales History',
  finance: 'Finance',
  marketing: 'Marketing',
  staff: 'Staff & Team',
  integrations: 'Integrations',
  settings: 'Settings',
  report: 'Report',
};

export function resolveMerchantPageTitle(pathname: string, activeTab: string): string {
  if (pathname.startsWith('/member-details/')) return 'Member details';
  if (pathname.startsWith('/integrations/google-reviews')) return 'Google Reviews';
  if (pathname.startsWith('/integrations/chatbot-api')) return 'Chatbot API';
  return MERCHANT_PAGE_TITLES[activeTab] || activeTab.replaceAll('-', ' ');
}

export function allowedNavCatalog(role: UserRole | null | undefined): MerchantNavDefinition[] {
  return MERCHANT_NAV_CATALOG.filter((item) => isTabAllowed(role, item.id));
}

export function groupedNavCatalog(items: MerchantNavDefinition[]) {
  return MERCHANT_NAV_GROUP_ORDER.map((label) => ({
    label,
    items: items.filter((item) => item.group === label),
  })).filter((group) => group.items.length > 0);
}

export function mobilePrimaryNav(
  role: UserRole | null | undefined,
  catalog: readonly MerchantNavDefinition[] = MERCHANT_NAV_CATALOG,
): MerchantNavDefinition[] {
  const ids = MOBILE_PRIMARY_NAV[role ?? 'cashier'] ?? MOBILE_PRIMARY_NAV.cashier;
  return ids
    .map((id) => catalog.find((item) => item.id === id))
    .filter((item): item is MerchantNavDefinition => Boolean(item));
}

export function moreNavCatalog(
  role: UserRole | null | undefined,
  allowed: MerchantNavDefinition[] = allowedNavCatalog(role),
): MerchantNavDefinition[] {
  const primary = new Set(mobilePrimaryNav(role).map((item) => item.id));
  return allowed.filter((item) => !primary.has(item.id));
}
