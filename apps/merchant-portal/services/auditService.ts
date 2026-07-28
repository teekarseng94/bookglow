import { createBrowserSupabaseClient } from '@bookglow/supabase';

export interface AuditEvent {
  id: string;
  outletId: string;
  action: string;
  affectedTarget: string;
  actor: string;
  timestamp: string;
  reason?: string;
  metadata?: any;
}

const localEvents = (): AuditEvent[] => {
  try {
    return JSON.parse(localStorage.getItem('bookglow_audit_logs') || '[]');
  } catch {
    return [];
  }
};

const serverAuditEnabled = import.meta.env.MODE !== 'test';

export const auditService = {
  logEvent: async (
    outletId: string,
    action: string,
    affectedTarget: string,
    actor: string,
    reason?: string,
    metadata?: any,
  ): Promise<AuditEvent> => {
    const event: AuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      outletId,
      action,
      affectedTarget,
      actor,
      timestamp: new Date().toISOString(),
      reason,
      metadata,
    };

    try {
      const logs = localEvents();
      logs.push(event);
      localStorage.setItem('bookglow_audit_logs', JSON.stringify(logs));
    } catch {
      // Server persistence below remains authoritative when browser storage is unavailable.
    }

    try {
      if (!serverAuditEnabled) return event;
      const supabase = createBrowserSupabaseClient(import.meta.env as any);
      const { data: serverId, error } = await (supabase as any).rpc('append_platform_audit_event', {
        p_outlet_id: outletId,
        p_action: action,
        p_affected_target: affectedTarget,
        p_reason: reason || null,
        p_metadata: metadata || {},
        p_source: 'merchant-portal',
      });
      if (!error && serverId) event.id = String(serverId);
    } catch {
      // Allows rollout before the migration is deployed; the local record is retained.
    }
    return event;
  },

  getEventsForOutlet: async (outletId: string): Promise<AuditEvent[]> => {
    const events = await auditService.getAllEvents();
    return events.filter((event) => event.outletId === outletId);
  },

  getAllEvents: async (): Promise<AuditEvent[]> => {
    try {
      if (!serverAuditEnabled) throw new Error('Server audit disabled in tests');
      const supabase = createBrowserSupabaseClient(import.meta.env as any);
      const { data, error } = await (supabase as any)
        .from('platform_audit_events')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(500);
      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          outletId: row.outlet_id || 'platform',
          action: row.action,
          affectedTarget: row.affected_target,
          actor: row.actor_email || row.actor_uid || 'System',
          timestamp: row.occurred_at,
          reason: row.reason || undefined,
          metadata: row.metadata,
        }));
      }
    } catch {
      // Fall through to rollout-safe local records.
    }
    return localEvents().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },
};
