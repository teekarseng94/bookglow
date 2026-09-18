import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, CalendarCheck, CalendarPlus, CheckCircle2, CircleX, MessageSquareWarning, RefreshCw, Wrench } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlatformMetricCard, PlatformPageHeader, PlatformSection } from '../components/admin';
import { useOutletInspector } from '../components/admin/OutletInspectorContext';
import { Button, EmptyState, ErrorState, LoadingSkeleton, StatusBadge, fieldControlClassName } from '../components/ui';
import { outletService } from '../services/databaseService';
import { platformStep2Service, type OperationsOverview, type OverviewMetricKey, type PlatformActivity } from '../services/platformStep2Service';
import type { Outlet } from '../types';

const localDate = () => new Date().toLocaleDateString('en-CA');
const drillLabels: Record<OverviewMetricKey, string> = {
  bookings_created: 'Bookings created', appointments_scheduled: 'Appointments scheduled', appointments_completed: 'Completed appointments', appointments_cancelled: 'Cancellations', failed_operations: 'Failed operations', failed_messages: 'Failed messages', unresolved_support: 'Unresolved support cases',
};

const SuperAdminDashboard: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const { openOutletInspector } = useOutletInspector();
  const [startDate, setStartDate] = useState(params.get('from') || localDate());
  const [endDate, setEndDate] = useState(params.get('to') || localDate());
  const [outletId, setOutletId] = useState(params.get('outlet') || '');
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [overview, setOverview] = useState<OperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drill, setDrill] = useState<OverviewMetricKey | null>((params.get('drill') as OverviewMetricKey) || null);
  const [activity, setActivity] = useState<PlatformActivity[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [activityLoading, setActivityLoading] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [outletRows, result] = await Promise.all([outletService.getAll(), platformStep2Service.overview(startDate, endDate, outletId)]);
      setOutlets(outletRows); setOverview(result);
      setParams((current) => { const next = new URLSearchParams(current); next.set('from', startDate); next.set('to', endDate); outletId ? next.set('outlet', outletId) : next.delete('outlet'); return next; }, { replace: true });
    } catch (value) { setError(value instanceof Error ? value.message : 'Platform operations could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const loadActivity = async (kind: OverviewMetricKey, page = 1) => {
    setDrill(kind); setActivityPage(page); setActivityLoading(true);
    setParams((current) => { const next = new URLSearchParams(current); next.set('drill', kind); return next; }, { replace: true });
    try { const result = await platformStep2Service.activity(kind, startDate, endDate, outletId, page); setActivity(result.rows); setActivityTotal(result.total); }
    catch (value) { setError(value instanceof Error ? value.message : 'Activity records could not be loaded.'); }
    finally { setActivityLoading(false); }
  };
  useEffect(() => { if (drill && overview) void loadActivity(drill, 1); }, [overview]);

  const metrics = overview?.metrics;
  const cards = useMemo(() => metrics ? [
    { key: null, label: 'Active outlets', value: metrics.active_outlets, hint: overview.active_outlet_definition, icon: Building2, to: '/admin/onboarding' },
    { key: 'bookings_created' as const, label: 'Bookings created', value: metrics.bookings_created, hint: 'Appointment records created in each outlet’s local date range.', icon: CalendarPlus },
    { key: 'appointments_scheduled' as const, label: 'Scheduled in range', value: metrics.appointments_scheduled, hint: 'Appointments whose scheduled local date falls in the range.', icon: CalendarCheck },
    { key: 'appointments_completed' as const, label: 'Completed', value: metrics.appointments_completed, hint: 'Completion timestamp falls in the outlet-local range.', icon: CheckCircle2 },
    { key: 'appointments_cancelled' as const, label: 'Cancellations', value: metrics.appointments_cancelled, hint: overview.cancellation_definition, icon: CircleX },
    { key: null, label: 'Onboarding attention', value: overview.onboarding_attention, hint: 'Outlets missing authoritative configuration requirements.', icon: AlertTriangle, to: '/admin/onboarding?stage=pending' },
    { key: 'failed_operations' as const, label: 'Failed operations', value: metrics.failed_operations, hint: 'Failed or partial durable platform operations.', icon: Wrench },
    { key: 'failed_messages' as const, label: 'Failed messages', value: metrics.failed_messages, hint: 'Authoritative marketing delivery attempts marked failed.', icon: MessageSquareWarning },
    { key: 'unresolved_support' as const, label: 'Open support', value: metrics.unresolved_support, hint: 'Support cases not marked resolved.', icon: AlertTriangle },
  ] : [], [metrics, overview]);

  return <div className="space-y-5">
    <PlatformPageHeader title="Platform operations" description="Evidence-backed operational activity. Merchant sales and Bookglow subscription revenue are reported elsewhere." action={<Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className="h-4 w-4" /> Refresh</Button>} />
    <div className="grid gap-3 rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_2fr_auto_auto]">
      <label className="text-xs font-bold text-[var(--text-secondary)]">From<input className={`${fieldControlClassName} mt-1`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
      <label className="text-xs font-bold text-[var(--text-secondary)]">To<input className={`${fieldControlClassName} mt-1`} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
      <label className="text-xs font-bold text-[var(--text-secondary)]">Outlet<select className={`${fieldControlClassName} mt-1`} value={outletId} onChange={(e) => setOutletId(e.target.value)}><option value="">All outlets</option>{outlets.map((o) => <option key={o.outletID} value={o.outletID}>{o.name || o.outletID}</option>)}</select></label>
      <Button className="self-end" variant="secondary" disabled={!outletId} onClick={() => outletId && openOutletInspector(outletId, 'summary')}>Inspect outlet</Button>
      <Button className="self-end" onClick={() => void load()} disabled={loading || !startDate || !endDate}>Apply</Button>
    </div>
    {loading ? <div className="rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-5"><LoadingSkeleton rows={8} /></div> : error && !overview ? <ErrorState message={error} onRetry={load} /> : overview ? <>
      {error ? <ErrorState message={error} onRetry={load} /> : null}
      <p className="text-xs text-[var(--text-muted)]">Last refreshed {new Date(overview.refreshed_at).toLocaleString()} · {overview.range_timezone_rule}</p>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3">{cards.map(({ key, icon: Icon, to, ...card }) => {
        const content = <PlatformMetricCard {...card} tone={card.value ? (card.label.includes('Failed') || card.label.includes('Cancellation') ? 'warning' : 'brand') : 'neutral'} icon={<Icon className="h-5 w-5" />} />;
        return to ? <Link key={card.label} to={to} className="rounded-ui-lg focus-visible:shadow-ui-focus-strong">{content}</Link> : <button key={card.label} type="button" className="text-left rounded-ui-lg focus-visible:shadow-ui-focus-strong" onClick={() => key && void loadActivity(key, 1)}>{content}</button>;
      })}</div>
      <PlatformSection title="Needs attention" description="Suspended portal access is not classified as a technical incident.">
        {!overview.attention.length ? <EmptyState className="m-4" title="No recorded operational exceptions" description="No unresolved support, failed operation, or server error records are available." /> : <div className="divide-y divide-[var(--line)]">{overview.attention.map((item, index) => <Link key={`${item.issue_type}-${item.occurred_at}-${index}`} to={item.destination} className="grid gap-2 px-4 py-3 hover:bg-[var(--bg-soft)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.outlet_name}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{item.issue}</p></div><div className="flex items-center gap-2"><StatusBadge tone={item.severity === 'critical' || item.severity === 'error' ? 'danger' : 'warning'}>{item.severity}</StatusBadge><span className="text-xs text-[var(--text-muted)]">{new Date(item.occurred_at).toLocaleString()}</span></div></Link>)}</div>}
      </PlatformSection>
      {drill ? <PlatformSection title={drillLabels[drill]} description={`${activityTotal.toLocaleString()} matching records. No customer names or contact details are shown.`}>
        {activityLoading ? <LoadingSkeleton rows={5} className="p-4" /> : !activity.length ? <EmptyState className="m-4" title="No matching records" description="The authoritative source has no records for this filter." /> : <div className="divide-y divide-[var(--line)]">{activity.map((row) => <div key={`${row.source}-${row.id}`} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><p className="truncate text-sm font-semibold">{row.outlet_name} · {row.id}</p><p className="text-xs text-[var(--text-muted)]">{row.source || 'Recorded activity'}{row.scheduled_for ? ` · scheduled ${row.scheduled_for}` : ''}{row.detail ? ` · ${row.detail}` : ''}</p></div><div className="text-xs text-[var(--text-muted)]"><StatusBadge>{row.state}</StatusBadge><span className="ml-2">{row.occurred_at ? new Date(row.occurred_at).toLocaleString() : 'Timestamp unavailable'}</span></div></div>)}</div>}
        <div className="flex justify-between gap-3 border-t border-[var(--line)] p-3"><Button variant="secondary" disabled={activityPage===1 || activityLoading} onClick={() => void loadActivity(drill, activityPage-1)}>Previous</Button><span className="self-center text-xs text-[var(--text-muted)]">Page {activityPage}</span><Button variant="secondary" disabled={activityPage*25>=activityTotal || activityLoading} onClick={() => void loadActivity(drill, activityPage+1)}>Next</Button></div>
      </PlatformSection> : null}
    </> : null}
  </div>;
};

export default SuperAdminDashboard;
