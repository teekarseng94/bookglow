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

export const auditService = {
  logEvent: async (
    outletId: string,
    action: string,
    affectedTarget: string,
    actor: string,
    reason?: string,
    metadata?: any
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

    console.log(`🟢 [AUDIT EVENT LOGGED]:`, event);

    try {
      const logsRaw = localStorage.getItem('bookglow_audit_logs');
      const logs: AuditEvent[] = logsRaw ? JSON.parse(logsRaw) : [];
      logs.push(event);
      localStorage.setItem('bookglow_audit_logs', JSON.stringify(logs));
    } catch (e) {
      console.warn('Failed to save audit log in localStorage:', e);
    }

    return event;
  },

  getEventsForOutlet: async (outletId: string): Promise<AuditEvent[]> => {
    try {
      const logsRaw = localStorage.getItem('bookglow_audit_logs');
      const logs: AuditEvent[] = logsRaw ? JSON.parse(logsRaw) : [];
      return logs
        .filter(log => log.outletId === outletId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch {
      return [];
    }
  }
};
