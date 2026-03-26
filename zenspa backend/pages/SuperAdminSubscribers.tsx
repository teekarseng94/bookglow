import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { outletService } from '../services/firestoreService';
import { Outlet } from '../types';

const SuperAdminSubscribers: React.FC = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const handleToggleAccess = async (outletId: string, currentlyActive: boolean | undefined) => {
    const actionLabel = currentlyActive === false ? 'enable' : 'disable';
    const confirmMessage =
      currentlyActive === false
        ? 'Re-enable portal access for this outlet?'
        : 'Disable portal access for this outlet? Users mapped to this outlet will no longer be able to sign in.';
    if (!window.confirm(confirmMessage)) return;
    try {
      await outletService.update(outletId, { isActive: currentlyActive === false ? true : false });
      setOutlets((prev) =>
        prev.map((o) =>
          o.outletID === outletId ? { ...o, isActive: currentlyActive === false ? true : false } : o
        )
      );
    } catch (err) {
      console.error('Failed to toggle portal access:', err);
      alert('Failed to update access status. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Subscribers</h2>
        <p className="text-sm text-slate-400 mt-1">
          All subscribed outlets with quick remote access controls.
        </p>
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading outlets…</p>}
      {error && !loading && (
        <p className="text-red-400 text-sm">Error loading outlets: {error}</p>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left">Outlet ID</th>
                <th className="px-4 py-2 text-left">Name</th>
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
                return (
                  <tr key={o.outletID} className="border-t border-slate-900">
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">
                      {o.outletID}
                    </td>
                    <td className="px-4 py-2 text-slate-100">
                      {(o as any).name || (o as any).settings?.shopName || '—'}
                    </td>
                    <td className="px-4 py-2 text-slate-400 text-xs">{joinDate}</td>
                    <td className="px-4 py-2 text-slate-400 text-xs">{lastLogin}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleAccess(o.outletID, isActive)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          isActive
                            ? 'bg-red-500 text-white hover:bg-red-400'
                            : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        }`}
                      >
                        {isActive ? 'Disable portal' : 'Enable portal'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {outlets.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-500 text-sm"
                  >
                    No subscribers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SuperAdminSubscribers;

