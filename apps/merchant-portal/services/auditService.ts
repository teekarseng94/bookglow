import { createBrowserSupabaseClient } from '@bookglow/supabase';

export interface AuditEvent {
  id: string;
  outletId: string;
  action: string;
  affectedTarget: string;
  actor: string;
  timestamp: string;
  outcome: 'succeeded' | 'failed' | 'partial';
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  outletId?: string;
  action?: string;
  actor?: string;
  from?: string;
  to?: string;
}

export interface AuditPage {
  events: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}

const client = () => createBrowserSupabaseClient(import.meta.env as any);
const mapEvent = (row: any): AuditEvent => ({
  id: String(row.id),
  outletId: row.outlet_id || 'platform',
  action: row.action,
  affectedTarget: row.affected_target,
  actor: row.actor_email || row.actor_uid || 'System',
  timestamp: row.occurred_at,
  outcome: row.outcome || 'succeeded',
  reason: row.reason || undefined,
  metadata: row.metadata || undefined,
});

export const auditService = {
  logEvent: async (
    outletId: string,
    action: string,
    affectedTarget: string,
    _actor: string,
    reason?: string,
    metadata?: Record<string, unknown>,
  ): Promise<AuditEvent> => {
    const { data: serverId, error } = await (client() as any).rpc('append_platform_audit_event', {
      p_outlet_id: outletId,
      p_action: action,
      p_affected_target: affectedTarget,
      p_reason: reason || null,
      p_metadata: metadata || {},
      p_source: 'merchant-portal',
    });
    if (error || !serverId) throw error || new Error('The server did not persist the audit event.');
    return {
      id: String(serverId), outletId, action, affectedTarget, actor: 'Current platform administrator',
      timestamp: new Date().toISOString(), outcome: 'succeeded', reason, metadata,
    };
  },

  getPage: async (query: AuditQuery = {}): Promise<AuditPage> => {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(10, query.pageSize || 50));
    let request = (client() as any).from('platform_audit_events').select('*', { count: 'exact' });
    if (query.outletId && query.outletId !== 'all') request = request.eq('outlet_id', query.outletId);
    if (query.action) request = request.ilike('action', `%${query.action.replace(/[%_,.()]/g, ' ')}%`);
    if (query.actor) request = request.ilike('actor_email', `%${query.actor.replace(/[%_,.()]/g, ' ')}%`);
    if (query.from) request = request.gte('occurred_at', query.from);
    if (query.to) request = request.lte('occurred_at', query.to);
    const search = (query.search || '').replace(/[%_,.()]/g, ' ').trim();
    if (search) request = request.or(`action.ilike.%${search}%,affected_target.ilike.%${search}%,reason.ilike.%${search}%`);
    const start = (page - 1) * pageSize;
    const { data, error, count } = await request.order('occurred_at', { ascending: false }).order('id', { ascending: false }).range(start, start + pageSize - 1);
    if (error) throw error;
    return { events: (data || []).map(mapEvent), total: count ?? 0, page, pageSize };
  },

  getEventsForOutlet: async (outletId: string): Promise<AuditEvent[]> =>
    (await auditService.getPage({ outletId, pageSize: 50 })).events,

  getAllEvents: async (): Promise<AuditEvent[]> =>
    (await auditService.getPage({ pageSize: 100 })).events,
};
