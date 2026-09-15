import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, PlugZap } from 'lucide-react';
import { PlatformMetricCard, PlatformPageHeader, PlatformSection } from '../components/admin';
import { Alert, Button, ConfirmationDialog, EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '../components/ui';
import { outletService } from '../services/databaseService';
import { platformOperationsService, type BillingReadiness, type PlatformSubscription } from '../services/platformOperationsService';
import type { Outlet } from '../types';
import { openExternalUrl } from '../src/native/androidShell';

const readinessCopy: Record<BillingReadiness['state'], { label: string; detail: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  subscription_data_unavailable: { label: 'Data unavailable', detail: 'Subscription records could not be queried. This does not imply a missing migration.', tone: 'danger' },
  provider_not_configured: { label: 'Provider not configured', detail: 'HitPay server credentials are missing. Checkout is disabled.', tone: 'warning' },
  configured_unverified: { label: 'Configured, unverified', detail: 'HitPay responded, but the plan or webhook salt could not be fully verified.', tone: 'warning' },
  readiness_verified: { label: 'Readiness verified', detail: 'HitPay API access and webhook salt are present. Register the webhook endpoint in the HitPay dashboard.', tone: 'success' },
  billing_service_error: { label: 'Billing service error', detail: 'HitPay is configured but its readiness check failed.', tone: 'danger' },
};

const calculateMrr = (subscriptions: PlatformSubscription[]) => {
  const paid = subscriptions.filter((item) => item.status === 'active');
  if (!paid.length) return { values: [] as string[], unavailable: false, detail: 'No active paid subscriptions.' };
  if (paid.some((item) => !item.mrrReliable || item.unitAmount == null || !item.currency || !item.recurringInterval || !item.intervalCount || !item.quantity)) {
    return { values: [] as string[], unavailable: true, detail: 'Unavailable until every active subscription has recurring amount, quantity, currency, and interval metadata.' };
  }
  const totals = new Map<string, number>();
  for (const item of paid) {
    const gross = item.unitAmount! * item.quantity! * (1 - (item.discountPercent || 0) / 100);
    const months = item.recurringInterval === 'year' ? 12 * item.intervalCount! : item.recurringInterval === 'month' ? item.intervalCount! : 0;
    if (!months) return { values: [] as string[], unavailable: true, detail: 'Unavailable because a recurring interval cannot be normalized to months.' };
    totals.set(item.currency!, (totals.get(item.currency!) || 0) + gross / months);
  }
  return { values: [...totals].map(([currency, cents]) => `${currency.toUpperCase()} ${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`), unavailable: false, detail: 'Active paid plans only; annual plans normalized monthly and percentage discounts applied. Trials and overdue subscriptions excluded.' };
};

const SuperAdminSubscriptions: React.FC = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [subscriptions, setSubscriptions] = useState<PlatformSubscription[]>([]);
  const [readiness, setReadiness] = useState<BillingReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyOutlet, setBusyOutlet] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ outletId: string; name: string } | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [outletData, readinessData] = await Promise.all([outletService.getAll(), platformOperationsService.getBillingReadiness()]);
      setOutlets(outletData); setReadiness(readinessData);
      if (readinessData.subscriptionDataAvailable) setSubscriptions(await platformOperationsService.listSubscriptions()); else setSubscriptions([]);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Subscription readiness could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => { const query = search.trim().toLowerCase(); return outlets.filter((outlet) => !query || (outlet.name || outlet.settings?.shopName || '').toLowerCase().includes(query) || outlet.outletID.toLowerCase().includes(query)); }, [outlets, search]);
  const subscriptionFor = (outletId: string) => subscriptions.find((subscription) => subscription.outletId === outletId);
  const activePaid = subscriptions.filter((item) => item.status === 'active').length;
  const trials = subscriptions.filter((item) => item.status === 'trialing').length;
  const mrr = useMemo(() => calculateMrr(subscriptions), [subscriptions]);
  const status = readiness ? readinessCopy[readiness.state] : null;

  const openBilling = async (outletId: string) => {
    setBusyOutlet(outletId); setActionError(null);
    try {
      const url = await platformOperationsService.createCheckout(outletId);
      await openExternalUrl(url);
    } catch (billingError) { setActionError(billingError instanceof Error ? billingError.message : 'Billing action failed.'); }
    finally { setBusyOutlet(null); }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const outletId = cancelTarget.outletId;
    setBusyOutlet(outletId); setActionError(null);
    try {
      await platformOperationsService.cancelSubscription(outletId);
      setCancelTarget(null);
      const readinessData = await platformOperationsService.getBillingReadiness();
      setReadiness(readinessData);
      if (readinessData.subscriptionDataAvailable) {
        setSubscriptions(await platformOperationsService.listSubscriptions());
      }
    } catch (billingError) { setActionError(billingError instanceof Error ? billingError.message : 'Could not cancel the subscription.'); }
    finally { setBusyOutlet(null); }
  };

  return <div className="space-y-5">
    <PlatformPageHeader title="Subscriptions" description="Bookglow subscription revenue from HitPay. Merchant sales are not included." meta={readiness?.checkedAt ? <span className="text-xs text-[var(--text-muted)]">Last checked {new Date(readiness.checkedAt).toLocaleString()}</span> : undefined} />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <PlatformMetricCard label="Active paid subscriptions" value={activePaid} hint={`${trials} trial${trials === 1 ? '' : 's'} · ${subscriptions.length} records`} tone="success" icon={<CreditCard className="h-5 w-5" />} />
      <PlatformMetricCard label="Monthly recurring revenue" value={mrr.unavailable ? 'Unavailable' : mrr.values.length ? mrr.values.join(' · ') : '—'} hint={mrr.detail} tone="neutral" icon={<CreditCard className="h-5 w-5" />} />
      <PlatformMetricCard label="Provider status" value={status?.label || 'Checking…'} hint={status?.detail || 'Secure readiness check in progress.'} tone={status?.tone || 'neutral'} icon={<PlugZap className="h-5 w-5" />} />
    </div>
    {status && readiness?.state !== 'readiness_verified' ? <Alert tone={status.tone === 'danger' ? 'danger' : 'warning'} title={status.label}>{readiness?.detail || status.detail} Webhook: {readiness?.webhook || 'unverified'}.</Alert> : null}
    {actionError ? <Alert tone="danger" title="Billing action failed">{actionError}</Alert> : null}
    <PlatformSection title="Outlet billing readiness" description="Merchant portal access is independent from Bookglow billing status.">
      <div className="border-b border-[var(--line)] p-4"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search outlets…" aria-label="Search subscription outlets" className="m-settings-control w-full max-w-md" /></div>
      {loading ? <LoadingSkeleton rows={6} className="p-4" /> : error ? <ErrorState className="m-4" message={error} onRetry={load} /> : filtered.length === 0 ? <EmptyState className="m-4" title="No outlets found" description="Try another outlet name or identifier." /> : <div className="divide-y divide-[var(--line)]">{filtered.map((outlet) => {
        const subscription = subscriptionFor(outlet.outletID);
        const outletName = outlet.name || outlet.settings?.shopName || outlet.outletID;
        const canStart = Boolean(readiness?.checkoutReady && (!subscription || ['canceled', 'cancelled'].includes(subscription.status)));
        const canCancel = Boolean(readiness?.checkoutReady && subscription && ['active', 'past_due', 'paused', 'incomplete'].includes(subscription.status));
        return <div key={outlet.outletID} className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--text-primary)]">{outletName}</p><p className="mt-0.5 font-mono text-[10px] text-[var(--text-muted)]">{outlet.outletID}</p></div>
          <StatusBadge tone={outlet.accessStatus === 'suspended' ? 'danger' : 'success'}>{outlet.accessStatus === 'suspended' ? 'Portal suspended' : 'Portal active'}</StatusBadge>
          <StatusBadge tone={subscription?.status === 'active' ? 'success' : subscription ? 'warning' : 'neutral'}>{subscription?.status || 'No subscription'}</StatusBadge>
          {canCancel ? <Button size="sm" variant="danger" disabled={busyOutlet === outlet.outletID} onClick={() => setCancelTarget({ outletId: outlet.outletID, name: outletName })}>{busyOutlet === outlet.outletID ? 'Cancelling…' : 'Cancel subscription'}</Button>
            : canStart ? <Button size="sm" variant="secondary" disabled={busyOutlet === outlet.outletID} onClick={() => void openBilling(outlet.outletID)}>{busyOutlet === outlet.outletID ? 'Opening…' : 'Start subscription'}</Button>
            : <span className="text-xs text-[var(--text-muted)]">{readiness?.checkoutReady ? '' : 'Billing actions unavailable'}</span>}
        </div>;
      })}</div>}
    </PlatformSection>
    <ConfirmationDialog
      open={Boolean(cancelTarget)}
      onClose={() => { if (!busyOutlet) setCancelTarget(null); }}
      onConfirm={() => void confirmCancel()}
      busy={Boolean(cancelTarget && busyOutlet === cancelTarget.outletId)}
      tone="danger"
      title="Cancel this subscription?"
      description={cancelTarget ? `This stops HitPay recurring billing for ${cancelTarget.name}. The merchant portal stays available; you can start a new subscription later.` : undefined}
      confirmLabel="Cancel subscription"
      cancelLabel="Keep subscription"
    />
  </div>;
};

export default SuperAdminSubscriptions;
export { calculateMrr };
