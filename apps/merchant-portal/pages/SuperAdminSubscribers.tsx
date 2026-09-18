import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PlatformMetricCard, PlatformPageHeader, PlatformSection } from '../components/admin';
import { useOutletInspector } from '../components/admin/OutletInspectorContext';
import { AppModal, Button, EmptyState, ErrorState, Field, LoadingSkeleton, StatusBadge, fieldControlClassName } from '../components/ui';
import { outletService } from '../services/databaseService';
import { platformOperationsService } from '../services/platformOperationsService';
import type { Outlet } from '../types';

type PendingKind = 'suspend' | 'restore' | 'delete';

const SuperAdminSubscribers: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const { openOutletInspector } = useOutletInspector();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [pending, setPending] = useState<{ kind: PendingKind; outlet: Outlet } | null>(null);
  const [reason, setReason] = useState('');
  const [typedName, setTypedName] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
    if (!legacyOutletId) return;
    const next = new URLSearchParams(params);
    next.delete('outlet');
    next.set('inspectOutlet', legacyOutletId);
    if (!next.has('inspectTab')) next.set('inspectTab', 'summary');
    setParams(next, { replace: true });
  }, [params, setParams]);
  const inspectOutlet = params.get('inspectOutlet');
  const hadInspector = useRef(Boolean(inspectOutlet));
  useEffect(() => {
    if (hadInspector.current && !inspectOutlet) void load();
    hadInspector.current = Boolean(inspectOutlet);
  }, [inspectOutlet]);

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
  const outletName = (outlet: Outlet) => outlet.name || outlet.settings?.shopName || outlet.outletID;
  const closePending = () => {
    if (busy) return;
    setPending(null);
    setReason('');
    setTypedName('');
    setActionError(null);
  };
  const openPending = (kind: PendingKind, outlet: Outlet) => {
    setPending({ kind, outlet });
    setReason('');
    setTypedName('');
    setActionError(null);
  };

  const confirmPending = async () => {
    if (!pending) return;
    if (reason.trim().length < 3) {
      setActionError('A reason of at least 3 characters is required.');
      return;
    }
    const name = outletName(pending.outlet);
    if (pending.kind === 'delete' && typedName.trim().toLocaleLowerCase() !== name.trim().toLocaleLowerCase()) {
      setActionError(`Type “${name}” to confirm deletion.`);
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      if (pending.kind === 'delete') {
        await platformOperationsService.deleteOutlet(pending.outlet.outletID, reason.trim(), typedName.trim());
      } else {
        await platformOperationsService.setOutletAccess(pending.outlet.outletID, pending.kind === 'restore', reason.trim());
      }
      setPending(null);
      setReason('');
      setTypedName('');
      await load();
    } catch (value) {
      setActionError(value instanceof Error ? value.message : 'The outlet action failed.');
    } finally {
      setBusy(false);
    }
  };

  const pendingDisabled = busy || reason.trim().length < 3
    || (pending?.kind === 'delete' && typedName.trim().toLocaleLowerCase() !== outletName(pending.outlet).trim().toLocaleLowerCase());

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
          const name = outletName(outlet);
          const suspendedOutlet = outlet.accessStatus === 'suspended';
          return (
            <div key={outlet.outletID} className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <button type="button" onClick={() => openOutletInspector(outlet.outletID, 'summary')} className="min-w-0 text-left hover:opacity-80">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="mt-1 truncate font-mono text-[10px] text-[var(--text-muted)]">{outlet.outletID}{outlet.email ? ` · ${outlet.email}` : ''}</p>
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={suspendedOutlet ? 'danger' : 'success'}>{suspendedOutlet ? 'Portal suspended' : 'Portal active'}</StatusBadge>
                <Button size="sm" variant="secondary" onClick={() => openOutletInspector(outlet.outletID, 'summary')}><Eye className="h-3.5 w-3.5" />Inspect</Button>
                <Button size="sm" variant={suspendedOutlet ? 'secondary' : 'danger'} onClick={() => openPending(suspendedOutlet ? 'restore' : 'suspend', outlet)}>
                  {suspendedOutlet ? 'Restore' : 'Suspend'}
                </Button>
                <Button size="sm" variant="danger" onClick={() => openPending('delete', outlet)}>Delete</Button>
              </div>
            </div>
          );
        })}</div>}
      </PlatformSection>
      <AppModal
        open={Boolean(pending)}
        onClose={closePending}
        title={pending?.kind === 'delete' ? 'Delete this outlet permanently?' : pending?.kind === 'restore' ? 'Restore portal access?' : 'Suspend portal access?'}
        description={pending ? (pending.kind === 'delete'
          ? `This removes ${outletName(pending.outlet)} and its BookGlow data. The merchant email can sign in and create a new outlet.`
          : pending.kind === 'restore'
            ? `Mapped users will be able to sign into ${outletName(pending.outlet)} again. Public booking is unchanged.`
            : `Mapped users will be blocked from ${outletName(pending.outlet)}. Public booking stays available.`) : undefined}
        size="sm"
        busy={busy}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={closePending} disabled={busy}>Cancel</Button><Button variant="danger" onClick={() => void confirmPending()} disabled={pendingDisabled}>{busy ? 'Working…' : pending?.kind === 'delete' ? 'Delete outlet' : pending?.kind === 'restore' ? 'Restore access' : 'Suspend access'}</Button></div>}
      >
        <div className="space-y-4">
          {pending?.kind === 'delete' ? <Field id="directory-confirm-name" label={`Type “${outletName(pending.outlet)}”`}><input id="directory-confirm-name" value={typedName} onChange={(event) => setTypedName(event.target.value)} className={fieldControlClassName} autoComplete="off" /></Field> : null}
          <Field id="directory-action-reason" label="Reason" hint="At least 3 characters; stored in the platform audit history.">
            <textarea id="directory-action-reason" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} className={`${fieldControlClassName} h-24 py-2`} />
          </Field>
          {actionError ? <p className="text-xs text-[var(--danger)]">{actionError}</p> : null}
        </div>
      </AppModal>
    </div>
  );
};

export default SuperAdminSubscribers;
