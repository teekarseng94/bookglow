import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, PlugZap } from 'lucide-react';
import { PlatformMetricCard, PlatformPageHeader, PlatformSection } from '../components/admin';
import { Alert, Button, EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '../components/ui';
import { outletService } from '../services/databaseService';
import { platformOperationsService, type PlatformSubscription } from '../services/platformOperationsService';
import type { Outlet } from '../types';

const SuperAdminSubscriptions: React.FC = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [subscriptions, setSubscriptions] = useState<PlatformSubscription[]>([]);
  const [billingConnected, setBillingConnected] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyOutlet, setBusyOutlet] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const outletData = await outletService.getAll();
      setOutlets(outletData);
      try {
        setSubscriptions(await platformOperationsService.listSubscriptions());
        setBillingConnected(true);
      } catch {
        setSubscriptions([]);
        setBillingConnected(false);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Subscription readiness could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return outlets.filter((outlet) =>
      !query || (outlet.name || outlet.settings?.shopName || '').toLowerCase().includes(query) || outlet.outletID.toLowerCase().includes(query),
    );
  }, [outlets, search]);

  const subscriptionFor = (outletId: string) => subscriptions.find((subscription) => subscription.outletId === outletId);
  const openBilling = async (outletId: string, existing: boolean) => {
    setBusyOutlet(outletId);
    setActionError(null);
    try {
      const url = existing
        ? await platformOperationsService.createBillingPortal(outletId)
        : await platformOperationsService.createCheckout(outletId, import.meta.env.VITE_STRIPE_PRICE_ID);
      window.location.assign(url);
    } catch (billingError) {
      setActionError(billingError instanceof Error ? billingError.message : 'Billing action failed.');
      setBusyOutlet(null);
    }
  };

  return (
    <div className="space-y-5">
      <PlatformPageHeader
        title="Subscriptions"
        description="Review outlet billing readiness. Charges, plans, MRR, renewals, and invoices remain unavailable until a billing provider is connected."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <PlatformMetricCard label="Active subscriptions" value={subscriptions.filter((item) => ['active', 'trialing'].includes(item.status)).length} hint={`${subscriptions.length} Stripe subscription records`} tone="success" icon={<CreditCard className="h-5 w-5" />} />
        <PlatformMetricCard label="Monthly recurring revenue" value="—" hint="Requires Stripe price/amount aggregation" tone="neutral" icon={<CreditCard className="h-5 w-5" />} />
        <PlatformMetricCard label="Provider status" value={billingConnected ? 'Stripe ready' : 'Setup required'} hint={`${outlets.length} outlets available for billing`} tone={billingConnected ? 'success' : 'warning'} icon={<PlugZap className="h-5 w-5" />} />
      </div>

      {!billingConnected ? <Alert tone="warning" title="Billing migration not available">Apply the platform billing migration and deploy the Stripe Edge Functions before starting subscriptions.</Alert> : null}
      {actionError ? <Alert tone="danger" title="Billing action failed">{actionError}</Alert> : null}

      <PlatformSection title="Outlet billing readiness" description="Operational access is shown separately from future billing status.">
        <div className="border-b border-[var(--line)] p-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search outlets…"
            aria-label="Search subscription outlets"
            className="m-settings-control w-full max-w-md"
          />
        </div>
        {loading ? <LoadingSkeleton rows={6} className="p-4" /> : error ? (
          <ErrorState className="m-4" message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState className="m-4" title="No outlets found" description="Try another outlet name or identifier." />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {filtered.map((outlet) => {
              const subscription = subscriptionFor(outlet.outletID);
              return (
              <div key={outlet.outletID} className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{outlet.name || outlet.settings?.shopName || outlet.outletID}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--text-muted)]">{outlet.outletID}</p>
                </div>
                <StatusBadge tone={outlet.isActive === false ? 'danger' : 'success'}>{outlet.isActive === false ? 'Suspended' : 'Portal active'}</StatusBadge>
                <StatusBadge tone={subscription && ['active', 'trialing'].includes(subscription.status) ? 'success' : subscription ? 'warning' : 'neutral'}>
                  {subscription?.status || 'Not subscribed'}
                </StatusBadge>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!billingConnected || busyOutlet === outlet.outletID}
                  onClick={() => openBilling(outlet.outletID, Boolean(subscription))}
                >
                  {busyOutlet === outlet.outletID ? 'Opening…' : subscription ? 'Manage billing' : 'Start subscription'}
                </Button>
              </div>
            )})}
          </div>
        )}
      </PlatformSection>
    </div>
  );
};

export default SuperAdminSubscriptions;
