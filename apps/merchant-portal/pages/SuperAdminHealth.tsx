import React, { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@bookglow/supabase';
import { CheckCircle2, CircleAlert, RefreshCw } from 'lucide-react';
import { PlatformPageHeader, PlatformSection } from '../components/admin';
import { Button, ErrorState, LoadingSkeleton, StatusBadge } from '../components/ui';
import { outletService } from '../services/databaseService';
import { platformOperationsService, type PlatformMonitoringEvent } from '../services/platformOperationsService';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded';
  detail: string;
}

const SuperAdminHealth: React.FC = () => {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [monitoringEvents, setMonitoringEvents] = useState<PlatformMonitoringEvent[]>([]);

  const runChecks = async () => {
    setLoading(true);
    setError(null);
    const results: HealthCheck[] = [];
    results.push({
      name: 'Browser connectivity',
      status: navigator.onLine ? 'healthy' : 'degraded',
      detail: navigator.onLine ? 'This browser reports an active network connection.' : 'This browser is currently offline.',
    });

    try {
      const outlets = await outletService.getAll();
      results.push({ name: 'Outlet database', status: 'healthy', detail: `${outlets.length} outlet records are reachable.` });
    } catch (outletError) {
      results.push({ name: 'Outlet database', status: 'degraded', detail: outletError instanceof Error ? outletError.message : 'Outlet query failed.' });
    }

    try {
      const supabase = createBrowserSupabaseClient(import.meta.env as any);
      const { count, error: identityError } = await supabase.from('users').select('uid', { count: 'exact', head: true });
      if (identityError) throw identityError;
      results.push({ name: 'Identity directory', status: 'healthy', detail: `${count ?? 0} platform user records are reachable.` });
    } catch (identityError) {
      results.push({ name: 'Identity directory', status: 'degraded', detail: identityError instanceof Error ? identityError.message : 'Identity query failed.' });
    }

    try {
      localStorage.setItem('bookglow_health_probe', new Date().toISOString());
      localStorage.removeItem('bookglow_health_probe');
      results.push({ name: 'Local audit storage', status: 'healthy', detail: 'Administrative audit events can be stored in this browser.' });
    } catch {
      results.push({ name: 'Local audit storage', status: 'degraded', detail: 'Browser storage is unavailable; local audit events may not persist.' });
    }

    try {
      const events = await platformOperationsService.listMonitoringEvents();
      setMonitoringEvents(events);
      results.push({ name: 'Server monitoring store', status: 'healthy', detail: `${events.length} recent server monitoring events are available.` });
    } catch (monitoringError) {
      setMonitoringEvents([]);
      results.push({ name: 'Server monitoring store', status: 'degraded', detail: monitoringError instanceof Error ? monitoringError.message : 'Monitoring query failed.' });
    }

    setChecks(results);
    setCheckedAt(new Date());
    setLoading(false);
    if (results.every((check) => check.status === 'degraded')) setError('All platform checks are currently degraded.');
  };

  useEffect(() => { runChecks(); }, []);

  const degraded = checks.filter((check) => check.status === 'degraded').length;

  return (
    <div className="space-y-5">
      <PlatformPageHeader
        title="System health"
        description="Run client-visible connectivity checks for platform data and administrative services."
        meta={checkedAt ? <span className="text-xs text-[var(--text-muted)]">Last checked {checkedAt.toLocaleTimeString()}</span> : undefined}
        action={<Button variant="secondary" onClick={runChecks}><RefreshCw className="h-4 w-4" /> Run checks</Button>}
      />
      {loading ? <LoadingSkeleton rows={5} className="rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-5" /> : error ? (
        <ErrorState message={error} onRetry={runChecks} />
      ) : (
        <PlatformSection
          title={degraded ? 'Platform degraded' : 'Platform healthy'}
          description={degraded ? `${degraded} checks need attention.` : 'All client-visible checks passed.'}
          action={<StatusBadge tone={degraded ? 'warning' : 'success'}>{degraded ? 'Degraded' : 'Healthy'}</StatusBadge>}
        >
          <div className="divide-y divide-[var(--line)]">
            {checks.map((check) => (
              <div key={check.name} className="flex gap-3 px-4 py-4">
                {check.status === 'healthy' ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--success)]" />
                ) : (
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" />
                )}
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{check.name}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--line)] bg-[var(--bg-soft)] px-4 py-3 text-xs text-[var(--text-secondary)]">
            Server logs, Cloud Function telemetry, uptime monitoring, and payment-provider health require dedicated monitoring integrations.
          </div>
        </PlatformSection>
      )}
      {!loading && monitoringEvents.length > 0 ? (
        <PlatformSection title="Recent server events" description="Append-only events emitted by billing and platform backend services.">
          <div className="divide-y divide-[var(--line)]">
            {monitoringEvents.slice(0, 20).map((event) => (
              <div key={event.id} className="grid gap-2 px-4 py-3.5 sm:grid-cols-[110px_120px_minmax(0,1fr)_170px] sm:items-center">
                <StatusBadge tone={event.severity === 'critical' || event.severity === 'error' ? 'danger' : event.severity === 'warning' ? 'warning' : 'neutral'}>
                  {event.severity}
                </StatusBadge>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">{event.service}</span>
                <span className="text-xs text-[var(--text-primary)]">{event.message}</span>
                <span className="text-[10px] text-[var(--text-muted)]">{new Date(event.occurredAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </PlatformSection>
      ) : null}
    </div>
  );
};

export default SuperAdminHealth;
