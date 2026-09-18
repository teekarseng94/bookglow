import React, { useEffect, useState } from 'react';
import { Check, Circle, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PlatformPageHeader, PlatformSection } from '../components/admin';
import { useOutletInspector } from '../components/admin/OutletInspectorContext';
import { Button, EmptyState, ErrorState, LoadingSkeleton, StatusBadge, fieldControlClassName } from '../components/ui';
import { platformStep2Service, type OnboardingReadiness } from '../services/platformStep2Service';
import { remoteAccessService } from '../services/remoteAccessService';

const checks: Array<[keyof OnboardingReadiness, string, string]> = [
  ['owner_assigned', 'Owner', 'Account assignment'], ['business_details', 'Business details', 'Name, contact and physical address when required'], ['operating_hours', 'Hours', 'At least one valid open day'], ['bookable_services', 'Services', 'At least one visible service with a duration'], ['booking_path', 'Booking path', 'Published path and public outlet visibility'], ['first_real_booking', 'Real booking', 'Verified from an actual public booking record'],
];

const SuperAdminOnboarding: React.FC = () => {
  const [params] = useSearchParams();
  const { openOutletInspector } = useOutletInspector();
  const [stage, setStage] = useState(params.get('stage') || 'all');
  const [search, setSearch] = useState(params.get('outlet') || '');
  const [rows, setRows] = useState<OnboardingReadiness[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remoteBusy, setRemoteBusy] = useState<string | null>(null);
  const limit = 20;
  const load = async (nextPage = page) => {
    setLoading(true); setError(null);
    try { const result = await platformStep2Service.onboarding(stage, search, nextPage, limit); setRows(result.rows); setTotal(result.total); setPage(nextPage); }
    catch (value) { setError(value instanceof Error ? value.message : 'Onboarding readiness could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(1); }, []);
  const enter = async (outletId: string) => { setRemoteBusy(outletId); setError(null); try { await remoteAccessService.enter(outletId); window.location.assign('/dashboard'); } catch (value) { setError(value instanceof Error ? value.message : 'Remote access could not be started.'); setRemoteBusy(null); } };

  return <div className="space-y-5">
    <PlatformPageHeader title="Outlet onboarding" description="Configuration readiness, merchant activation, and verified real booking evidence are tracked separately." action={<Button variant="secondary" onClick={() => void load(1)}><RefreshCw className="h-4 w-4" /> Refresh</Button>} />
    <div className="grid gap-3 rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-4 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
      <input className={fieldControlClassName} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search outlet or ID" aria-label="Search onboarding outlets" />
      <select className={fieldControlClassName} value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Filter onboarding stage"><option value="all">All stages</option><option value="pending">Pending</option><option value="ready">Ready</option><option value="activated">Activated</option></select>
      <Button onClick={() => void load(1)} disabled={loading}>Apply</Button>
    </div>
    {error ? <ErrorState message={error} onRetry={() => load(page)} /> : null}
    <PlatformSection title="Readiness tracker" description={`${total.toLocaleString()} matching outlets. Staff is informational because the current booking model supports unassigned appointments.`}>
      {loading ? <LoadingSkeleton rows={8} className="p-4" /> : !rows.length ? <EmptyState className="m-4" title="No outlets match" description="Try another stage or search term." /> : <div className="divide-y divide-[var(--line)]">{rows.map((row) => <article key={row.outlet_id} className="space-y-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-bold">{row.name || row.outlet_id}</h3><StatusBadge tone={row.stage === 'activated' ? 'success' : row.stage === 'ready' ? 'brand' : 'warning'}>{row.stage}</StatusBadge><StatusBadge tone={row.onboarding_status === 'complete' ? 'success' : 'neutral'}>Merchant {row.onboarding_status === 'complete' ? 'activated' : 'not activated'}</StatusBadge></div><p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">{row.outlet_id} · {row.timezone || 'Timezone missing'}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => openOutletInspector(row.outlet_id, 'onboarding')}><ExternalLink className="h-3.5 w-3.5" />Inspector</Button><Button size="sm" variant="secondary" disabled={remoteBusy===row.outlet_id} onClick={() => void enter(row.outlet_id)}><ShieldCheck className="h-4 w-4" />{remoteBusy===row.outlet_id ? 'Opening…' : 'Remote access'}</Button></div></div>
        <div className="grid gap-2 min-[480px]:grid-cols-2 lg:grid-cols-3">{checks.map(([key,label,detail]) => { const ok=Boolean(row[key]); return <div key={String(key)} className={`rounded-ui-md border p-3 ${ok ? 'border-[var(--success)]/25 bg-[var(--success-soft)]' : 'border-[var(--warning)]/25 bg-[var(--warning-soft)]'}`}><p className="flex items-center gap-2 text-xs font-bold">{ok ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Circle className="h-4 w-4 text-[var(--warning)]" />}{label}</p><p className="mt-1 text-[11px] text-[var(--text-secondary)]">{detail}</p></div>; })}</div>
        <p className="text-xs text-[var(--text-muted)]">Staff configured: {row.staff_configured ? 'Yes' : 'No'} · Configuration: {row.configuration_ready ? 'ready' : 'missing requirements'} · Updated {new Date(row.updated_at).toLocaleString()}</p>
      </article>)}</div>}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] p-3"><Button variant="secondary" disabled={page===1 || loading} onClick={() => void load(page-1)}>Previous</Button><span className="text-xs text-[var(--text-muted)]">Page {page} of {Math.max(1,Math.ceil(total/limit))}</span><Button variant="secondary" disabled={page*limit>=total || loading} onClick={() => void load(page+1)}>Next</Button></div>
    </PlatformSection>
  </div>;
};

export default SuperAdminOnboarding;
