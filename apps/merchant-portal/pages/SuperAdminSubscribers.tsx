import React, { useEffect, useMemo, useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PlatformMetricCard, PlatformPageHeader, PlatformSection } from '../components/admin';
import { useOutletInspector } from '../components/admin/OutletInspectorContext';
import { Button, EmptyState, ErrorState, LoadingSkeleton, StatusBadge, fieldControlClassName } from '../components/ui';
import { outletService } from '../services/databaseService';
import type { Outlet } from '../types';

const SuperAdminSubscribers: React.FC = () => {
  const [params] = useSearchParams();
  const { openOutletInspector, selectedOutletId } = useOutletInspector();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'suspended'>('all');

  const load = async () => {
    setLoading(true);
    setError(null);
    try { setOutlets(await outletService.getAll()); }
    catch (value) { setError(value instanceof Error ? value.message : 'Outlets could not be loaded.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const legacyOutletId = params.get('outlet');
    if (legacyOutletId && selectedOutletId !== legacyOutletId) openOutletInspector(legacyOutletId, 'summary');
  }, [params, selectedOutletId]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return outlets.filter((outlet) => {
      const access = outlet.accessStatus === 'suspended' ? 'suspended' : 'active';
      const matchesStatus = status === 'all' || status === access;
      const matchesSearch = !query
        || outlet.outletID.toLocaleLowerCase().includes(query)
        || (outlet.name || outlet.settings?.shopName || '').toLocaleLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [outlets, search, status]);

  const suspended = outlets.filter((outlet) => outlet.accessStatus === 'suspended').length;
  const publicBookingReady = outlets.filter((outlet) => Boolean(outlet.bookingSlug && outlet.isActive !== false)).length;

  return (
    <div className="space-y-5">
      <PlatformPageHeader
        title="Outlets & access"
        description="Open the shared inspector for account administration, portal controls, remote access, onboarding, billing, integrations, support, and audit evidence."
        action={<Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className="h-4 w-4" />Refresh</Button>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <PlatformMetricCard label="Outlets" value={outlets.length} hint="Authoritative outlet records" tone="brand" />
        <PlatformMetricCard label="Portal suspended" value={suspended} hint="Independent from public booking state" tone={suspended ? 'warning' : 'neutral'} />
        <PlatformMetricCard label="Booking path ready" value={publicBookingReady} hint="Published slug and active public outlet" tone="success" />
      </div>
      <PlatformSection title="Outlet directory" description={`${filtered.length.toLocaleString()} matching outlets`}>
        <div className="grid gap-2 border-b border-[var(--line)] p-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search outlet name or ID" aria-label="Search outlets" className={fieldControlClassName} />
          <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="Filter portal access" className={fieldControlClassName}><option value="all">All portal states</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
        </div>
        {loading ? <LoadingSkeleton rows={8} className="p-4" /> : error ? <ErrorState className="m-4" message={error} onRetry={load} /> : !filtered.length ? <EmptyState className="m-4" title="No outlets match" description="Change the name, identifier, or portal-state filter." /> : <div className="divide-y divide-[var(--line)]">{filtered.map((outlet) => {
          const outletName = outlet.name || outlet.settings?.shopName || outlet.outletID;
          const suspendedOutlet = outlet.accessStatus === 'suspended';
          return <button key={outlet.outletID} type="button" onClick={() => openOutletInspector(outlet.outletID, 'summary')} className="grid w-full gap-3 px-4 py-3.5 text-left hover:bg-[var(--bg-soft)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-semibold">{outletName}</p><p className="mt-1 truncate font-mono text-[10px] text-[var(--text-muted)]">{outlet.outletID}{outlet.email ? ` · ${outlet.email}` : ''}</p></div><div className="flex flex-wrap items-center gap-2"><StatusBadge tone={suspendedOutlet ? 'danger' : 'success'}>{suspendedOutlet ? 'Portal suspended' : 'Portal active'}</StatusBadge><span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)]"><Eye className="h-3.5 w-3.5" />Inspect</span></div></button>;
        })}</div>}
      </PlatformSection>
    </div>
  );
};

export default SuperAdminSubscribers;
