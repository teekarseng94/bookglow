import React, { useEffect, useState } from 'react';
import { outletService } from '../services/databaseService';
import { Outlet } from '../types';
import { PlatformPageHeader } from '../components/admin';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';

const SuperAdminSubscribers: React.FC = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingToggle, setPendingToggle] = useState<{
    outletId: string;
    currentlyActive: boolean;
    name: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    outletService
      .getAll()
      .then((data) => {
        if (!cancelled) {
          setOutlets(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load outlets for Super Admin:', err);
          setError(err.message || 'Failed to load outlets');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const formatDate = (value: any, withTime = false): string => {
    if (!value) return '—';
    try {
      let d: Date | null = null;
      if (typeof value === 'string') {
        d = new Date(value);
      } else if (typeof value.toDate === 'function') {
        d = value.toDate();
      }
      if (!d || isNaN(d.getTime())) return '—';
      return withTime ? d.toLocaleString() : d.toLocaleDateString();
    } catch {
      return '—';
    }
  };

  const confirmToggleAccess = async () => {
    if (!pendingToggle) return;
    const { outletId, currentlyActive } = pendingToggle;
    setBusy(true);
    try {
      await outletService.update(outletId, { isActive: currentlyActive === false ? true : false });
      setOutlets((prev) =>
        prev.map((o) =>
          o.outletID === outletId ? { ...o, isActive: currentlyActive === false ? true : false } : o
        )
      );
      setPendingToggle(null);
    } catch (err) {
      console.error('Failed to toggle portal access:', err);
      alert('Failed to update access status. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PlatformPageHeader
        title="Subscribers"
        description="All subscribed outlets with portal access controls. Disable is a platform-level action — confirm before changing."
      />

      {loading && <LoadingSkeleton rows={4} />}
      {error && !loading && (
        <ErrorState title="Could not load outlets" message={error} />
      )}

      {!loading && !error && outlets.length === 0 && (
        <EmptyState title="No subscribers found." description="Outlets will appear here when registered." />
      )}

      {!loading && !error && outlets.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {outlets.map((o) => {
              const joinDate = formatDate((o as any).createdAt, false);
              const lastLogin = formatDate((o as any).lastLogin, true);
              const isActive = (o as any).isActive !== false;
              const name = (o as any).name || (o as any).settings?.shopName || '—';
              return (
                <div
                  key={o.outletID}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-100 truncate">{name}</p>
                      <p className="text-[11px] font-mono text-slate-500 truncate">{o.outletID}</p>
                    </div>
                    <StatusBadge tone={isActive ? 'success' : 'danger'}>
                      {isActive ? 'Active' : 'Disabled'}
                    </StatusBadge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div>
                      <p className="uppercase tracking-wide text-[10px] text-slate-500">Joined</p>
                      <p>{joinDate}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide text-[10px] text-slate-500">Last login</p>
                      <p>{lastLogin}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={isActive ? 'danger' : 'primary'}
                    fullWidth
                    onClick={() =>
                      setPendingToggle({ outletId: o.outletID, currentlyActive: isActive, name })
                    }
                  >
                    {isActive ? 'Disable portal' : 'Enable portal'}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-4 py-2 text-left">Outlet ID</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Join Date</th>
                  <th className="px-4 py-2 text-left">Last Login</th>
                  <th className="px-4 py-2 text-right">Remote Control</th>
                </tr>
              </thead>
              <tbody>
                {outlets.map((o) => {
                  const joinDate = formatDate((o as any).createdAt, false);
                  const lastLogin = formatDate((o as any).lastLogin, true);
                  const isActive = (o as any).isActive !== false;
                  const name = (o as any).name || (o as any).settings?.shopName || '—';
                  return (
                    <tr key={o.outletID} className="border-t border-slate-900">
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{o.outletID}</td>
                      <td className="px-4 py-2 text-slate-100">{name}</td>
                      <td className="px-4 py-2">
                        <StatusBadge tone={isActive ? 'success' : 'danger'}>
                          {isActive ? 'Active' : 'Disabled'}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-2 text-slate-400 text-xs">{joinDate}</td>
                      <td className="px-4 py-2 text-slate-400 text-xs">{lastLogin}</td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant={isActive ? 'danger' : 'primary'}
                          onClick={() =>
                            setPendingToggle({
                              outletId: o.outletID,
                              currentlyActive: isActive,
                              name,
                            })
                          }
                        >
                          {isActive ? 'Disable portal' : 'Enable portal'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmationDialog
        open={!!pendingToggle}
        onClose={() => {
          if (!busy) setPendingToggle(null);
        }}
        onConfirm={confirmToggleAccess}
        busy={busy}
        tone={pendingToggle?.currentlyActive ? 'danger' : 'primary'}
        title={
          pendingToggle?.currentlyActive
            ? 'Disable portal access?'
            : 'Re-enable portal access?'
        }
        description={
          pendingToggle?.currentlyActive
            ? `Disable portal access for ${pendingToggle?.name}? Users mapped to this outlet will no longer be able to sign in.`
            : `Re-enable portal access for ${pendingToggle?.name}?`
        }
        confirmLabel={pendingToggle?.currentlyActive ? 'Disable portal' : 'Enable portal'}
      />
    </div>
  );
};

export default SuperAdminSubscribers;
