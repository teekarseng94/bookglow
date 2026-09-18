import { createBrowserSupabaseClient } from '@bookglow/supabase';

export type GlobalSearchEntityType =
  | 'outlet'
  | 'user'
  | 'booking'
  | 'sale'
  | 'support_case'
  | 'operation'
  | 'audit';

export interface GlobalSearchResult {
  type: GlobalSearchEntityType;
  id: string;
  title: string;
  matchedText: string;
  outletId: string | null;
  outletName: string | null;
  status: string | null;
  timestamp: string | null;
}

export interface OutletInspectorAccount {
  id: string;
  name: string | null;
  email: string | null;
  role: 'owner' | 'admin' | 'manager' | 'cashier' | string;
  membershipStatus: string;
  accountStatus: string;
  lastSignInAt: string | null;
  invitationState: string;
}

export interface OutletInspectorBilling {
  provider: string | null;
  status: string | null;
  trialEnd: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  unitAmount: number | null;
  currency: string | null;
  recurringInterval: string | null;
  intervalCount: number | null;
  quantity: number | null;
  discountPercent: number | null;
  mrrReliable: boolean;
}

export interface OutletInspectorSummary {
  outletId: string;
  name: string;
  portalStatus: string;
  onboardingStatus: string;
  lastActivityAt: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  email: string | null;
  phone: string | null;
  bookingSlug: string | null;
  timezone: string | null;
  businessHoursStatus: 'configured' | 'missing' | 'unknown';
  activeUserCount: number;
  recentActivity: Array<{
    type: string;
    reference: string;
    status: string | null;
    occurredAt: string | null;
  }>;
}

export interface OutletInspectorPayload {
  summary: OutletInspectorSummary;
  accounts: OutletInspectorAccount[];
  billing: OutletInspectorBilling | null;
}

const allowedTypes = new Set<GlobalSearchEntityType>([
  'outlet', 'user', 'booking', 'sale', 'support_case', 'operation', 'audit',
]);
const text = (value: unknown, max = 240): string | null =>
  typeof value === 'string' ? value.slice(0, max) : null;
const numberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * Keep the browser contract allow-listed. Unknown database fields (including
 * provider payloads or future secret-bearing columns) are deliberately dropped.
 */
export const mapGlobalSearchResult = (row: Record<string, unknown>): GlobalSearchResult | null => {
  const type = text(row.entity_type, 40) as GlobalSearchEntityType | null;
  const id = text(row.entity_id, 200);
  const title = text(row.title, 240);
  if (!type || !allowedTypes.has(type) || !id || !title) return null;
  return {
    type,
    id,
    title,
    matchedText: text(row.matched_text, 240) || title,
    outletId: text(row.outlet_id, 200),
    outletName: text(row.outlet_name, 240),
    status: text(row.status, 80),
    timestamp: text(row.occurred_at, 80),
  };
};

const mapInspector = (value: any): OutletInspectorPayload => {
  const summary = value?.summary || {};
  return {
    summary: {
      outletId: text(summary.outlet_id, 200) || '',
      name: text(summary.name, 240) || text(summary.outlet_id, 200) || 'Unknown outlet',
      portalStatus: text(summary.portal_status, 80) || 'unknown',
      onboardingStatus: text(summary.onboarding_status, 80) || 'unknown',
      lastActivityAt: text(summary.last_activity_at, 80),
      ownerName: text(summary.owner_name, 240),
      ownerEmail: text(summary.owner_email, 240),
      email: text(summary.email, 240),
      phone: text(summary.phone, 80),
      bookingSlug: text(summary.booking_slug, 240),
      timezone: text(summary.timezone, 120),
      businessHoursStatus: ['configured', 'missing'].includes(summary.business_hours_status)
        ? summary.business_hours_status
        : 'unknown',
      activeUserCount: numberOrNull(summary.active_user_count) || 0,
      recentActivity: Array.isArray(summary.recent_activity)
        ? summary.recent_activity.slice(0, 8).map((row: any) => ({
            type: text(row.type, 80) || 'activity',
            reference: text(row.reference, 200) || 'Unavailable',
            status: text(row.status, 80),
            occurredAt: text(row.occurred_at, 80),
          }))
        : [],
    },
    accounts: Array.isArray(value?.accounts)
      ? value.accounts.slice(0, 100).map((row: any) => ({
          id: text(row.id, 200) || '',
          name: text(row.name, 240),
          email: text(row.email, 240),
          role: text(row.role, 40) || 'cashier',
          membershipStatus: text(row.membership_status, 80) || 'unknown',
          accountStatus: text(row.account_status, 80) || 'active',
          lastSignInAt: text(row.last_sign_in_at, 80),
          invitationState: text(row.invitation_state, 80) || 'unknown',
        })).filter((row: OutletInspectorAccount) => row.id)
      : [],
    billing: value?.billing ? {
      provider: text(value.billing.provider, 80),
      status: text(value.billing.status, 80),
      trialEnd: text(value.billing.trial_end, 80),
      currentPeriodStart: text(value.billing.current_period_start, 80),
      currentPeriodEnd: text(value.billing.current_period_end, 80),
      unitAmount: numberOrNull(value.billing.unit_amount),
      currency: text(value.billing.currency, 20),
      recurringInterval: text(value.billing.recurring_interval, 40),
      intervalCount: numberOrNull(value.billing.interval_count),
      quantity: numberOrNull(value.billing.quantity),
      discountPercent: numberOrNull(value.billing.discount_percent),
      mrrReliable: value.billing.mrr_reliable === true,
    } : null,
  };
};

const client = () => createBrowserSupabaseClient(import.meta.env as any) as any;

export const superAdminPhase1Service = {
  search: async (query: string, limitPerGroup = 5): Promise<GlobalSearchResult[]> => {
    const normalized = query.trim().slice(0, 120);
    if (normalized.length < 2) return [];
    const { data, error } = await client().rpc('platform_global_search', {
      p_query: normalized,
      p_limit_per_group: Math.min(10, Math.max(1, limitPerGroup)),
    });
    if (error) throw error;
    const rows = Array.isArray(data) ? data : data?.results;
    return (Array.isArray(rows) ? rows : [])
      .map((row) => mapGlobalSearchResult(row as Record<string, unknown>))
      .filter((row): row is GlobalSearchResult => Boolean(row));
  },

  inspector: async (outletId: string): Promise<OutletInspectorPayload> => {
    const { data, error } = await client().rpc('platform_outlet_inspector', { p_outlet_id: outletId });
    if (error) throw error;
    const mapped = mapInspector(data);
    if (!mapped.summary.outletId) throw new Error('The outlet inspector returned no outlet.');
    return mapped;
  },
};
