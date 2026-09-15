import { createBrowserSupabaseClient } from '@bookglow/supabase';
import { merchantPublicOrigin } from '../src/native/androidShell';

export interface PlatformSubscription {
  id: string;
  outletId: string;
  priceId: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  unitAmount: number | null;
  currency: string | null;
  recurringInterval: string | null;
  intervalCount: number | null;
  quantity: number | null;
  discountPercent: number | null;
  mrrReliable: boolean;
}

export interface BillingReadiness {
  state: 'subscription_data_unavailable' | 'provider_not_configured' | 'configured_unverified' | 'readiness_verified' | 'billing_service_error';
  provider: 'hitpay' | 'stripe';
  subscriptionDataAvailable: boolean;
  subscriptionCount?: number;
  priceVerified?: boolean;
  webhook: 'verified' | 'secret_present_endpoint_unverified' | 'not_configured' | 'unverified';
  checkoutReady: boolean;
  portalReady: boolean;
  checkedAt?: string;
  detail?: string;
}

export interface RemoteAccessContext { outletId: string; outletName: string; accessStatus: string; }

export interface PlatformMonitoringEvent {
  id: string;
  service: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  eventType: string;
  message: string;
  outletId: string | null;
  correlationId: string | null;
  occurredAt: string;
}

const client = () => createBrowserSupabaseClient(import.meta.env as any);

export const platformOperationsService = {
  listSubscriptions: async (): Promise<PlatformSubscription[]> => {
    const { data, error } = await (client() as any).from('outlet_subscriptions').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      outletId: row.outlet_id,
      priceId: row.hitpay_plan_id || row.stripe_price_id,
      status: row.status,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      currentPeriodEnd: row.current_period_end,
      unitAmount: row.unit_amount == null ? null : Number(row.unit_amount),
      currency: row.currency || null,
      recurringInterval: row.recurring_interval || null,
      intervalCount: row.interval_count == null ? null : Number(row.interval_count),
      quantity: row.quantity == null ? null : Number(row.quantity),
      discountPercent: row.discount_percent == null ? null : Number(row.discount_percent),
      mrrReliable: row.mrr_reliable === true,
    }));
  },

  getBillingReadiness: async (): Promise<BillingReadiness> => {
    const { data, error } = await client().functions.invoke('billing-admin', { body: { action: 'readiness' } });
    if (error) throw new Error((data as any)?.error || error.message);
    return data as BillingReadiness;
  },

  setOutletAccess: async (outletId: string, enabled: boolean, reason: string) => {
    const { data, error } = await (client() as any).rpc('platform_set_outlet_access', {
      p_outlet_id: outletId, p_enabled: enabled, p_reason: reason,
    });
    if (error) throw error;
    return data;
  },

  remoteAccess: async (outletId: string, action: 'enter' | 'exit' | 'validate'): Promise<RemoteAccessContext> => {
    const { data, error } = await (client() as any).rpc('platform_remote_access', { p_outlet_id: outletId, p_action: action });
    if (error) throw error;
    return { outletId: data.outlet_id, outletName: data.outlet_name || data.outlet_id, accessStatus: data.access_status };
  },

  createCheckout: async (outletId: string): Promise<string> => {
    const { data, error } = await client().functions.invoke('billing-admin', {
      body: { action: 'create_checkout', outletId, appUrl: merchantPublicOrigin() },
    });
    if (error) throw new Error((data as any)?.error || error.message);
    if (!data?.url) throw new Error((data as any)?.error || 'HitPay checkout URL was not returned.');
    return data.url;
  },

  cancelSubscription: async (outletId: string): Promise<void> => {
    const { data, error } = await client().functions.invoke('billing-admin', {
      body: { action: 'cancel_subscription', outletId },
    });
    if (error) throw new Error((data as any)?.error || error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
  },

  deleteOutlet: async (outletId: string, reason: string, confirmName: string) => {
    try {
      await platformOperationsService.cancelSubscription(outletId);
    } catch {
      // No active HitPay subscription, or HitPay already cancelled it.
    }
    const { data, error } = await (client() as any).rpc('platform_delete_outlet', {
      p_outlet_id: outletId,
      p_reason: reason,
      p_confirm_name: confirmName,
    });
    if (error) throw error;
    return data;
  },

  listMonitoringEvents: async (): Promise<PlatformMonitoringEvent[]> => {
    const { data, error } = await (client() as any).rpc('platform_monitoring_events_page', { p_limit: 200, p_offset: 0 });
    if (error) throw error;
    const rows = Array.isArray(data) ? data : data?.rows || [];
    return rows.map((row: any) => ({
      id: row.id,
      service: row.service,
      severity: row.severity,
      eventType: row.event_type,
      message: row.message,
      outletId: row.outlet_id,
      correlationId: row.correlation_id,
      occurredAt: row.occurred_at,
    }));
  },
};
