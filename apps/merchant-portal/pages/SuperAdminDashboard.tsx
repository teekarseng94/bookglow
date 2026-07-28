import React, { useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@bookglow/supabase';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleOff,
  ExternalLink,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PlatformMetricCard, PlatformPageHeader, PlatformSection } from '../components/admin';
import { Button, EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '../components/ui';
import { outletService } from '../services/databaseService';
import type { Outlet } from '../types';

interface PlatformUser {
  uid: string;
  outlet_id: string | null;
  role: string | null;
}

const SuperAdminDashboard: React.FC = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const outletsData = await outletService.getAll();
      const supabase = createBrowserSupabaseClient(import.meta.env as any);
      const { data, error: usersError } = await supabase.from('users').select('uid,outlet_id,role');
      if (usersError) throw usersError;
      setOutlets(outletsData);
      setUsers((data || []) as PlatformUser[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Platform records could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const metrics = useMemo(() => {
    const active = outlets.filter((outlet) => outlet.isActive !== false).length;
    const suspended = outlets.length - active;
    const pendingSetup = outlets.filter((outlet) => !outlet.bookingSlug).length;
    const mappedAccounts = users.filter((user) => Boolean(user.outlet_id)).length;
    return { active, suspended, pendingSetup, mappedAccounts };
  }, [outlets, users]);

  const attentionOutlets = useMemo(
    () =>
      outlets
        .filter((outlet) => outlet.isActive === false || !outlet.bookingSlug || !outlet.email)
        .sort((a, b) => Number(a.isActive !== false) - Number(b.isActive !== false))
        .slice(0, 6),
    [outlets],
  );

  return (
    <div className="space-y-5">
      <PlatformPageHeader
        title="Platform overview"
        description="Monitor outlet readiness, merchant access, and issues that need administrative attention."
        action={(
          <Button variant="secondary" onClick={loadOverview}>
            Refresh
          </Button>
        )}
      />

      {loading ? (
        <div className="rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-5">
          <LoadingSkeleton rows={6} />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadOverview} retryLabel="Retry platform overview" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <PlatformMetricCard
              label="Active outlets"
              value={metrics.active}
              hint={`${outlets.length} total merchant workspaces`}
              tone="success"
              icon={<Building2 className="h-5 w-5" aria-hidden />}
            />
            <PlatformMetricCard
              label="Mapped accounts"
              value={metrics.mappedAccounts}
              hint="Users currently assigned to an outlet"
              tone="brand"
              icon={<UserRound className="h-5 w-5" aria-hidden />}
            />
            <PlatformMetricCard
              label="Pending setup"
              value={metrics.pendingSetup}
              hint="Outlets without a public booking path"
              tone={metrics.pendingSetup ? 'warning' : 'success'}
              icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
            />
            <PlatformMetricCard
              label="Suspended"
              value={metrics.suspended}
              hint="Merchant workspaces with portal access disabled"
              tone={metrics.suspended ? 'danger' : 'neutral'}
              icon={<CircleOff className="h-5 w-5" aria-hidden />}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.7fr)]">
            <PlatformSection
              title="Needs attention"
              description="Operational exceptions are prioritised ahead of general activity."
              action={(
                <Link to="/admin/subscribers" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">
                  View all outlets <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
            >
              {attentionOutlets.length === 0 ? (
                <EmptyState
                  className="m-4"
                  title="No outlet issues detected"
                  description="All active outlets have the minimum setup information."
                />
              ) : (
                <div className="divide-y divide-[var(--line)]">
                  {attentionOutlets.map((outlet) => {
                    const issues = [
                      outlet.isActive === false ? 'Portal suspended' : null,
                      !outlet.bookingSlug ? 'Booking path missing' : null,
                      !outlet.email ? 'Business email missing' : null,
                    ].filter(Boolean);
                    return (
                      <Link
                        key={outlet.outletID}
                        to="/admin/subscribers"
                        className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-[var(--bg-soft)]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {outlet.name || outlet.settings?.shopName || outlet.outletID}
                          </p>
                          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{issues.join(' · ')}</p>
                        </div>
                        <StatusBadge tone={outlet.isActive === false ? 'danger' : 'warning'}>
                          {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
                        </StatusBadge>
                      </Link>
                    );
                  })}
                </div>
              )}
            </PlatformSection>

            <PlatformSection title="System readiness" description="Current connectivity for administrative operations.">
              <div className="space-y-1 p-3">
                {[
                  ['Outlet database', 'Connected'],
                  ['Identity directory', 'Connected'],
                  ['Portal access controls', 'Available'],
                ].map(([label, status]) => (
                  <div key={label} className="flex items-center justify-between rounded-ui-md px-2 py-3">
                    <span className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <CheckCircle2 className="h-4 w-4 text-[var(--success)]" aria-hidden />
                      {label}
                    </span>
                    <span className="text-xs font-semibold text-[var(--success)]">{status}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[var(--line)] bg-[var(--bg-soft)] px-4 py-3">
                <p className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <ShieldCheck className="h-4 w-4 text-[var(--brand)]" aria-hidden />
                  Platform actions continue to use the existing audited handlers.
                </p>
              </div>
            </PlatformSection>
          </div>
        </>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
