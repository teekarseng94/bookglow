import React, { useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@bookglow/supabase';
import { PlatformMetricCard, PlatformPageHeader, PlatformSection } from '../components/admin';
import { EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '../components/ui';
import { accountAdminService } from '../services/accountAdminService';
import { auditService } from '../services/auditService';
import { outletService } from '../services/databaseService';
import type { Outlet } from '../types';

interface PlatformUser {
  uid: string;
  email: string | null;
  outlet_id: string | null;
  role: string | null;
  display_name: string | null;
  created_at: string | null;
}

const SuperAdminUsers: React.FC = () => {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [savingUid, setSavingUid] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient(import.meta.env as any);
      const [{ data, error: userError }, outletData] = await Promise.all([
        supabase.from('users').select('*'),
        outletService.getAll(),
      ]);
      if (userError) throw userError;
      setUsers((data || []) as PlatformUser[]);
      setOutlets(outletData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Platform users could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery = !query || (user.email || '').toLowerCase().includes(query) || (user.display_name || '').toLowerCase().includes(query);
      return matchesQuery && (role === 'all' || user.role === role);
    });
  }, [role, search, users]);

  const updateRole = async (user: PlatformUser, nextRole: string) => {
    if (!window.confirm(`Change ${user.email || 'this user'} to ${nextRole}?`)) return;
    setSavingUid(user.uid);
    try {
      await accountAdminService.changeRole(user.uid, nextRole);
      await auditService.logEvent(user.outlet_id || 'platform', 'role changed', user.email || user.uid, 'Super Admin', `Role changed to ${nextRole}`);
      await load();
    } finally {
      setSavingUid(null);
    }
  };

  const outletName = (id: string | null) =>
    outlets.find((outlet) => outlet.outletID === id)?.name || id || 'No outlet assigned';

  return (
    <div className="space-y-5">
      <PlatformPageHeader title="Platform users" description="Find merchant accounts, review outlet mapping, and manage application roles." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <PlatformMetricCard label="Total users" value={users.length} hint="Records in the platform user directory" tone="brand" />
        <PlatformMetricCard label="Unassigned" value={users.filter((user) => !user.outlet_id).length} hint="Accounts without an outlet mapping" tone="warning" />
        <PlatformMetricCard label="Administrators" value={users.filter((user) => user.role === 'admin' || user.role === 'platform_admin').length} hint="Outlet and platform administrators" tone="success" />
      </div>
      <PlatformSection title="User directory">
        <div className="flex flex-col gap-2 border-b border-[var(--line)] p-4 sm:flex-row">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email…" aria-label="Search platform users" className="m-settings-control flex-1" />
          <select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Filter users by role" className="m-settings-control sm:w-48">
            <option value="all">All roles</option>
            <option value="platform_admin">Platform admin</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
          </select>
        </div>
        {loading ? <LoadingSkeleton rows={7} className="p-4" /> : error ? <ErrorState className="m-4" message={error} onRetry={load} /> : filtered.length === 0 ? (
          <EmptyState className="m-4" title="No users found" description="Adjust the search or role filter." />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {filtered.map((user) => (
              <div key={user.uid} className="grid gap-3 px-4 py-3.5 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.7fr)_160px] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{user.display_name || user.email || 'Unnamed user'}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{user.email || user.uid}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-[var(--text-secondary)]">{outletName(user.outlet_id)}</p>
                  {!user.outlet_id ? <StatusBadge tone="warning">Needs mapping</StatusBadge> : null}
                </div>
                <select
                  value={user.role || 'cashier'}
                  disabled={savingUid === user.uid || user.role === 'platform_admin'}
                  onChange={(event) => updateRole(user, event.target.value)}
                  aria-label={`Role for ${user.email || user.uid}`}
                  className="m-settings-control text-xs"
                >
                  {user.role === 'platform_admin' ? <option value="platform_admin">Platform admin</option> : null}
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </PlatformSection>
    </div>
  );
};

export default SuperAdminUsers;
