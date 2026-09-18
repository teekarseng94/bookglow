import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlatformPageHeader, PlatformSection } from '../components/admin';
import { Button, EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '../components/ui';
import { auditService, type AuditEvent } from '../services/auditService';
import { outletService } from '../services/databaseService';
import type { Outlet } from '../types';

const SuperAdminAudit: React.FC = () => {
  const [params] = useSearchParams();
  const selectedEventId = params.get('event') || '';
  const requestedOutletId = params.get('outlet') || 'all';
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [outletId, setOutletId] = useState(params.get('outlet') || 'all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 50;

  useEffect(() => { outletService.getAll().then(setOutlets).catch(() => setOutlets([])); }, []);
  useEffect(() => {
    if (!selectedEventId) return;
    setOutletId(requestedOutletId); setSearch(''); setAction(''); setActor(''); setFrom(''); setTo(''); setPage(1);
  }, [selectedEventId, requestedOutletId]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true); setError(null);
      auditService.getPage({ page, pageSize, search, action, actor, outletId: selectedEventId ? requestedOutletId : outletId, eventId: selectedEventId || undefined, from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined, to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined })
        .then((result) => { setEvents(result.events); setTotal(result.total); })
        .catch((loadError) => { setEvents([]); setTotal(0); setError(loadError instanceof Error ? loadError.message : 'Authoritative audit history is unavailable.'); })
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [page, search, action, actor, outletId, from, to, selectedEventId, requestedOutletId]);

  const updateFilter = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setter(event.target.value); setPage(1); };
  const outletName = (id: string) => outlets.find((outlet) => outlet.outletID === id)?.name || id;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return <div className="space-y-5">
    <PlatformPageHeader title="Audit log" description="Authoritative, append-only server history for privileged platform operations." meta={<StatusBadge tone={error ? 'danger' : loading ? 'neutral' : 'success'}>{error ? 'Server unavailable' : loading ? 'Loading server history' : 'Server-backed'}</StatusBadge>} />
    <PlatformSection title="Administrative activity" description={loading ? 'Loading authoritative records…' : `${events.length} records on this page · ${total} matching events`}>
      <div className="grid gap-2 border-b border-[var(--line)] p-4 md:grid-cols-2 xl:grid-cols-4">
        <input value={search} onChange={updateFilter(setSearch)} placeholder="Search target, reason, or action…" aria-label="Search audit events" className="m-settings-control" />
        <input value={action} onChange={updateFilter(setAction)} placeholder="Filter action…" aria-label="Filter by action" className="m-settings-control" />
        <input value={actor} onChange={updateFilter(setActor)} placeholder="Filter actor email…" aria-label="Filter by actor" className="m-settings-control" />
        <select value={outletId} onChange={updateFilter(setOutletId)} aria-label="Filter by outlet" className="m-settings-control"><option value="all">All outlets</option>{outlets.map((outlet) => <option key={outlet.outletID} value={outlet.outletID}>{outlet.name || outlet.outletID}</option>)}</select>
        <label className="text-xs text-[var(--text-secondary)]">From<input type="date" value={from} onChange={updateFilter(setFrom)} className="m-settings-control mt-1 w-full" /></label>
        <label className="text-xs text-[var(--text-secondary)]">To<input type="date" value={to} onChange={updateFilter(setTo)} className="m-settings-control mt-1 w-full" /></label>
      </div>
      {loading ? <LoadingSkeleton rows={8} className="p-4" /> : error ? <ErrorState className="m-4" title="Server audit unavailable" message={error} /> : events.length === 0 ? <EmptyState className="m-4" title="No audit events found" description="No authoritative server events match these filters." /> : <div className="divide-y divide-[var(--line)]">{events.map((event) => <article key={event.id} className={`grid gap-2 px-4 py-4 lg:grid-cols-[170px_minmax(0,1fr)_220px] ${selectedEventId===event.id?'bg-[var(--brand-soft)] ring-2 ring-inset ring-[var(--brand)]':''}`}>
        <div><p className="text-xs font-semibold text-[var(--text-primary)]">{new Date(event.timestamp).toLocaleDateString()}</p><p className="text-[10px] text-[var(--text-muted)]">{new Date(event.timestamp).toLocaleTimeString()}</p></div>
        <div className="min-w-0"><div className="flex items-center gap-2"><p className="text-sm font-semibold text-[var(--text-primary)]">{event.action}</p><StatusBadge tone={event.outcome === 'succeeded' ? 'success' : event.outcome === 'partial' ? 'warning' : 'danger'}>{event.outcome}</StatusBadge></div><p className="mt-1 text-xs text-[var(--text-secondary)]">{event.affectedTarget}</p>{event.reason ? <p className="mt-1 text-xs italic text-[var(--text-muted)]">Reason: {event.reason}</p> : null}</div>
        <div className="text-xs text-[var(--text-secondary)]"><p className="font-semibold">{outletName(event.outletId)}</p><p className="mt-1 text-[var(--text-muted)]">By {event.actor}</p></div>
      </article>)}</div>}
      {!loading && !error && total > pageSize ? <div className="flex items-center justify-between border-t border-[var(--line)] p-4"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-xs text-[var(--text-muted)]">Page {page} of {pages}</span><Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button></div> : null}
    </PlatformSection>
  </div>;
};

export default SuperAdminAudit;
