import { createBrowserSupabaseClient } from '@bookglow/supabase';

export interface PlatformSubscription {
  id: string;
  outletId: string;
  priceId: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

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
      priceId: row.stripe_price_id,
      status: row.status,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      currentPeriodEnd: row.current_period_end,
    }));
  },

  createCheckout: async (outletId: string, priceId?: string): Promise<string> => {
    const { data, error } = await client().functions.invoke('billing-admin', {
      body: { action: 'create_checkout', outletId, priceId, appUrl: window.location.origin },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('Stripe Checkout URL was not returned.');
    return data.url;
  },

  createBillingPortal: async (outletId: string): Promise<string> => {
    const { data, error } = await client().functions.invoke('billing-admin', {
      body: { action: 'create_portal', outletId, appUrl: window.location.origin },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('Stripe billing portal URL was not returned.');
    return data.url;
  },

  listMonitoringEvents: async (): Promise<PlatformMonitoringEvent[]> => {
    const { data, error } = await (client() as any).from('platform_monitoring_events').select('*').order('occurred_at', { ascending: false }).limit(200);
    if (error) throw error;
    return (data || []).map((row: any) => ({
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
