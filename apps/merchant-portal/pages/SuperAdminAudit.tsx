import React, { useEffect, useMemo, useState } from 'react';
import { PlatformPageHeader, PlatformSection } from '../components/admin';
import { EmptyState, StatusBadge } from '../components/ui';
import { auditService, type AuditEvent } from '../services/auditService';
import { outletService } from '../services/databaseService';
import type { Outlet } from '../types';

const SuperAdminAudit: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [search, setSearch] = useState('');
  const [outletId, setOutletId] = useState('all');

  useEffect(() => {
    Promise.all([auditService.getAllEvents(), outletService.getAll()]).then(([auditEvents, outletData]) => {
      setEvents(auditEvents);
      setOutlets(outletData);
    });
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      const matchesOutlet = outletId === 'all' || event.outletId === outletId;
      const haystack = `${event.action} ${event.affectedTarget} ${event.actor} ${event.reason || ''}`.toLowerCase();
      return matchesOutlet && (!query || haystack.includes(query));
    });
  }, [events, outletId, search]);

  const outletName = (id: string) => outlets.find((outlet) => outlet.outletID === id)?.name || id;

  return (
    <div className="space-y-5">
      <PlatformPageHeader
        title="Audit log"
        description="Review append-only administrative actions, including remote control, access, billing, and role changes."
        meta={<StatusBadge tone="success">Server-backed audit</StatusBadge>}
      />
      <PlatformSection title="Administrative activity" description={`${filtered.length} of ${events.length} events shown`}>
        <div className="flex flex-col gap-2 border-b border-[var(--line)] p-4 sm:flex-row">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search action, target, actor, or reason…" aria-label="Search audit events" className="m-settings-control flex-1" />
          <select value={outletId} onChange={(event) => setOutletId(event.target.value)} aria-label="Filter audit events by outlet" className="m-settings-control sm:w-56">
            <option value="all">All outlets</option>
            {outlets.map((outlet) => <option key={outlet.outletID} value={outlet.outletID}>{outlet.name || outlet.outletID}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? (
          <EmptyState className="m-4" title="No audit events found" description="Administrative actions recorded in this browser will appear here." />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {filtered.map((event) => (
              <article key={event.id} className="grid gap-2 px-4 py-4 lg:grid-cols-[170px_minmax(0,1fr)_220px]">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{new Date(event.timestamp).toLocaleDateString()}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{new Date(event.timestamp).toLocaleTimeString()}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold capitalize text-[var(--text-primary)]">{event.action}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{event.affectedTarget}</p>
                  {event.reason ? <p className="mt-1 text-xs italic text-[var(--text-muted)]">Reason: {event.reason}</p> : null}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  <p className="font-semibold">{outletName(event.outletId)}</p>
                  <p className="mt-1 text-[var(--text-muted)]">By {event.actor}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </PlatformSection>
      <p className="text-xs leading-5 text-[var(--text-muted)]">
        During migration rollout, the client retains a browser-local fallback if the server audit table is unavailable. Apply the platform migration to make the append-only server record authoritative.
      </p>
    </div>
  );
};

export default SuperAdminAudit;
