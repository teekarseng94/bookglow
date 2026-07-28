import React, { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from "@bookglow/supabase";
import { outletService } from '../services/databaseService';
import { accountAdminService } from '../services/accountAdminService';
import { auditService, AuditEvent } from '../services/auditService';
import { Outlet } from '../types';
import { PlatformPageHeader } from '../components/admin';

interface PortalUser {
  uid: string;
  email: string | null;
  outlet_id: string | null;
  role: string | null;
  display_name: string | null;
  created_at: string | null;
}

interface ConfirmState {
  type: 'suspend_portal' | 'restore_portal' | 'disable_account' | 'reactivate_account' | 'remove_account' | 'transfer_ownership' | 'revoke_sessions' | 'archive_outlet';
  targetId: string;
  targetName: string;
  consequence: string;
  reasonRequired: boolean;
  onConfirm: (reason: string) => Promise<void>;
}

const SuperAdminSubscribers: React.FC = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [setupFilter, setSetupFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'activity'>('name');

  // Detail Drawer State
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'access' | 'activity'>('overview');
  const [outletEvents, setOutletEvents] = useState<AuditEvent[]>([]);

  // Confirmation Flow State
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);
  const [confirmReason, setConfirmReason] = useState('');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // New Account Invite Input (inside drawer Accounts tab)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'cashier'>('admin');

  // Load database content
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const outletsData = await outletService.getAll();
      setOutlets(outletsData);

      const sb = createBrowserSupabaseClient(import.meta.env as any);
      const { data: usersData, error: usersErr } = await sb.from("users").select("*");
      if (usersErr) throw usersErr;
      setUsers((usersData || []) as PortalUser[]);
    } catch (err: any) {
      console.error('Failed to load Outlets & Access data:', err);
      setError(err.message || 'Failed to load database records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch audit logs for the selected outlet
  useEffect(() => {
    if (selectedOutlet) {
      auditService.getEventsForOutlet(selectedOutlet.outletID).then(setOutletEvents);
    }
  }, [selectedOutlet]);

  const formatDate = (value: any, withTime = false): string => {
    if (!value) return '—';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return '—';
      return withTime 
        ? d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) 
        : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
      return '—';
    }
  };

  // Calculations for Summary Cards
  const stats = {
    total: outlets.length,
    active: outlets.filter(o => o.isActive !== false).length,
    pending: outlets.filter(o => !o.bookingSlug).length,
    suspended: outlets.filter(o => o.isActive === false).length,
  };

  // Sort and Filter Logic
  const filteredOutlets = outlets
    .filter(o => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      const outletName = (o.name || o.settings?.shopName || '').toLowerCase();
      const outletId = o.outletID.toLowerCase();
      
      // Find mapped users for this outlet to search by owner/primary admin details
      const outletUsers = users.filter(u => u.outlet_id === o.outletID);
      const ownerMatch = outletUsers.some(u => 
        (u.display_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );

      const matchesSearch = !q || outletName.includes(q) || outletId.includes(q) || ownerMatch;

      // 2. Status Filter
      const isActive = o.isActive !== false;
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && isActive) || 
        (statusFilter === 'suspended' && !isActive);

      // 3. Setup Filter
      const isSetupCompleted = !!o.bookingSlug;
      const matchesSetup = 
        setupFilter === 'all' || 
        (setupFilter === 'completed' && isSetupCompleted) || 
        (setupFilter === 'pending' && !isSetupCompleted);

      return matchesSearch && matchesStatus && matchesSetup;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = (a.name || a.settings?.shopName || '').toLowerCase();
        const nameB = (b.name || b.settings?.shopName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'created') {
        const dateA = a.createdAt || '';
        const dateB = b.createdAt || '';
        return dateB.localeCompare(dateA); // Newest first
      }
      if (sortBy === 'activity') {
        const dateA = a.updatedAt || a.createdAt || '';
        const dateB = b.updatedAt || b.createdAt || '';
        return dateB.localeCompare(dateA); // Recent activity first
      }
      return 0;
    });

  // Access Control Toggles
  const handleTogglePortalAccess = (outlet: Outlet) => {
    const isActive = outlet.isActive !== false;
    if (isActive) {
      // Suspending portal
      setConfirmModal({
        type: 'suspend_portal',
        targetId: outlet.outletID,
        targetName: outlet.name || 'this workspace',
        consequence: 'Users mapped to this outlet will be immediately blocked from signing into the merchant portal. Public customer booking pages will remain active.',
        reasonRequired: true,
        onConfirm: async (reason) => {
          await outletService.update(outlet.outletID, { isActive: false });
          await auditService.logEvent(outlet.outletID, 'portal suspended', 'portal access', 'Super Admin', reason);
          loadData();
          if (selectedOutlet?.outletID === outlet.outletID) {
            setSelectedOutlet(prev => prev ? { ...prev, isActive: false } : null);
          }
        }
      });
    } else {
      // Restoring portal
      setConfirmModal({
        type: 'restore_portal',
        targetId: outlet.outletID,
        targetName: outlet.name || 'this workspace',
        consequence: 'Re-enable merchant workspace access. Mapped users will be able to log in normally.',
        reasonRequired: false,
        onConfirm: async (reason) => {
          await outletService.update(outlet.outletID, { isActive: true });
          await auditService.logEvent(outlet.outletID, 'portal enabled', 'portal access', 'Super Admin', reason || 'Access restored by super admin.');
          loadData();
          if (selectedOutlet?.outletID === outlet.outletID) {
            setSelectedOutlet(prev => prev ? { ...prev, isActive: true } : null);
          }
        }
      });
    }
  };

  const handleToggleAllowNewAccounts = async (outlet: Outlet, allowed: boolean) => {
    try {
      const updatedSettings = {
        ...(outlet.settings || {}),
        allowNewAccounts: allowed
      };
      await outletService.update(outlet.outletID, { settings: updatedSettings as any });
      await auditService.logEvent(
        outlet.outletID,
        allowed ? 'allow new accounts enabled' : 'allow new accounts disabled',
        'outlet settings',
        'Super Admin'
      );
      loadData();
      setSelectedOutlet(prev => prev ? { ...prev, settings: { ...(prev.settings || {}), allowNewAccounts: allowed } as any } : null);
    } catch (err: any) {
      alert('Failed to update accounts permission: ' + err.message);
    }
  };

  // Remote View action
  const handleRemoteView = (outletId: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('adminOverrideOutletId', outletId);
      auditService.logEvent(outletId, 'remote-control entered', 'merchant portal', 'Super Admin');
      window.location.href = '/dashboard';
    }
  };

  // Drawer User Actions
  const handleUserRoleChange = async (user: PortalUser, newRole: string) => {
    try {
      await accountAdminService.changeRole(user.uid, newRole);
      await auditService.logEvent(
        selectedOutlet!.outletID,
        'role changed',
        `user role for ${user.email} changed to ${newRole.toUpperCase()}`,
        'Super Admin'
      );
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveUser = (user: PortalUser) => {
    setConfirmModal({
      type: 'remove_account',
      targetId: user.uid,
      targetName: user.email || 'this account',
      consequence: 'The user will be detached from this outlet. They will no longer have access to this workspace.',
      reasonRequired: true,
      onConfirm: async (reason) => {
        await accountAdminService.removeFromOutlet(user.uid);
        await auditService.logEvent(
          selectedOutlet!.outletID,
          'account removed',
          `user ${user.email} removed from outlet`,
          'Super Admin',
          reason
        );
        loadData();
      }
    });
  };

  const handleTransferOwnership = (currentOwner: PortalUser, newOwner: PortalUser) => {
    setConfirmModal({
      type: 'transfer_ownership',
      targetId: newOwner.uid,
      targetName: newOwner.email || 'new owner',
      consequence: `This will transfer primary admin privileges for ${selectedOutlet?.name}. ${currentOwner.email} will be demoted to MANAGER, and ${newOwner.email} will be promoted to ADMIN.`,
      reasonRequired: true,
      onConfirm: async (reason) => {
        await accountAdminService.transferOwnership(selectedOutlet!.outletID, currentOwner.uid, newOwner.uid);
        await auditService.logEvent(
          selectedOutlet!.outletID,
          'owner transferred',
          `ownership transferred from ${currentOwner.email} to ${newOwner.email}`,
          'Super Admin',
          reason
        );
        loadData();
      }
    });
  };

  const handleAuthAction = (action: 'suspend' | 'reactivate' | 'reset_password' | 'revoke_sessions' | 'invite', user?: PortalUser) => {
    const name = user ? (user.email || 'this account') : inviteEmail;
    const execute = async () => {
      if (action === 'invite') {
        await accountAdminService.inviteAccount(inviteEmail, inviteRole, selectedOutlet!.outletID);
      } else if (action === 'suspend') {
        await accountAdminService.suspendAccount(user!.uid);
      } else if (action === 'reactivate') {
        await accountAdminService.reactivateAccount(user!.uid);
      } else if (action === 'reset_password') {
        await accountAdminService.requirePasswordReset(user!.uid);
      } else if (action === 'revoke_sessions') {
        await accountAdminService.revokeSessions(user!.uid);
      }
    };

    setConfirmModal({
      type: action === 'suspend' ? 'disable_account' : action === 'reactivate' ? 'reactivate_account' : action === 'revoke_sessions' ? 'revoke_sessions' : 'disable_account',
      targetId: user?.uid || 'action',
      targetName: name,
      consequence: 'This action requires secure identity provider APIs (Supabase Auth Admin SDK).',
      reasonRequired: false,
      onConfirm: async () => {
        await execute();
      }
    });
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmModal) return;
    if (confirmModal.reasonRequired && !confirmReason.trim()) {
      setConfirmError('A reason is required to execute this operational action.');
      return;
    }

    setActionBusy(true);
    setConfirmError(null);
    try {
      await confirmModal.onConfirm(confirmReason);
      setConfirmModal(null);
      setConfirmReason('');
    } catch (err: any) {
      setConfirmError(err.message || 'Operation failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const openOutletDrawer = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setActiveTab('overview');
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PlatformPageHeader
          title="Outlets & Access"
          description="Manage merchant workspaces, portal access and outlet user accounts."
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Outlets', value: stats.total, color: 'text-slate-900 bg-white border-slate-200' },
          { label: 'Active Outlets', value: stats.active, color: 'text-emerald-700 bg-white border-slate-200' },
          { label: 'Pending Setup', value: stats.pending, color: 'text-amber-700 bg-white border-slate-200' },
          { label: 'Suspended Access', value: stats.suspended, color: 'text-rose-700 bg-white border-slate-200' },
        ].map((card) => (
          <div
            key={card.label}
            className={`border rounded-xl p-4 shadow-sm bg-white ${card.color}`}
          >
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Search, Filter & Sort Row */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by outlet name, ID, owner email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
          />
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 bg-slate-50 text-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="all">All Access Statuses</option>
            <option value="active">Active Portal</option>
            <option value="suspended">Suspended Portal</option>
          </select>

          {/* Setup Filter */}
          <select
            value={setupFilter}
            onChange={(e) => setSetupFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 bg-slate-50 text-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="all">All Setup Statuses</option>
            <option value="completed">Setup Completed</option>
            <option value="pending">Pending Setup</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 bg-slate-50 text-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="name">Sort by Name</option>
            <option value="created">Sort by Joined Date</option>
            <option value="activity">Sort by Recent Activity</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm text-slate-500">Loading Outlets & Access records...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-center">
          <p className="font-semibold">Could not load outlet database</p>
          <p className="text-xs mt-1 text-rose-600">{error}</p>
        </div>
      )}

      {!loading && !error && filteredOutlets.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-slate-900">No outlets found</h3>
          <p className="mt-1 text-xs text-slate-500">Try adjusting your search criteria or filters.</p>
        </div>
      )}

      {/* Outlets Table / Mobile list */}
      {!loading && !error && filteredOutlets.length > 0 && (
        <>
          {/* Mobile view (stacked cards) */}
          <div className="md:hidden space-y-3">
            {filteredOutlets.map((o) => {
              const isActive = o.isActive !== false;
              const isSetupCompleted = !!o.bookingSlug;
              const mappedUsers = users.filter(u => u.outlet_id === o.outletID);
              const primaryAdmin = mappedUsers.find(u => u.role === 'admin' || u.role === 'platform_admin');
              
              return (
                <div
                  key={o.outletID}
                  onClick={() => openOutletDrawer(o)}
                  className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 hover:border-violet-300 transition-colors shadow-sm cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
<<<<<<< HEAD
                      <p className="font-semibold text-slate-100 truncate">{name}</p>
                      <p className="m-caption font-mono text-slate-500 truncate">{o.outletID}</p>
                    </div>
                    <StatusBadge tone={isActive ? 'success' : 'danger'}>
                      {isActive ? 'Active' : 'Disabled'}
                    </StatusBadge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div>
                      <p className="uppercase tracking-wide m-caption text-slate-500">Joined</p>
                      <p>{joinDate}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide m-caption text-slate-500">Last login</p>
                      <p>{lastLogin}</p>
=======
                      <p className="font-semibold text-slate-950 truncate">{o.name || o.settings?.shopName || '—'}</p>
                      <p className="text-[10px] font-mono text-slate-400 truncate">{o.outletID}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        isActive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {isActive ? 'Active' : 'Suspended'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        isSetupCompleted 
                          ? 'bg-sky-50 text-sky-700 border-sky-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {isSetupCompleted ? 'Completed' : 'Pending Setup'}
                      </span>
>>>>>>> 7ef38685c93a70cde4da2747e2bed0d29e5e4d5a
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 border-t border-slate-50 pt-2">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Admin</p>
                      <p className="truncate font-medium text-slate-700">{primaryAdmin?.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Accounts</p>
                      <p className="font-medium text-slate-700">{mappedUsers.length} active</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoteView(o.outletID);
                      }}
                      className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-center"
                    >
                      Remote View
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePortalAccess(o);
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors text-center border ${
                        isActive 
                          ? 'border-rose-200 text-rose-700 hover:bg-rose-50' 
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {isActive ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop view (table) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">Outlet</th>
                  <th className="px-4 py-3 text-left">Owner / Primary Admin</th>
                  <th className="px-4 py-3 text-left">Accounts</th>
                  <th className="px-4 py-3 text-left">Portal Status</th>
                  <th className="px-4 py-3 text-left">Setup Status</th>
                  <th className="px-4 py-3 text-left">Last Activity</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOutlets.map((o) => {
                  const isActive = o.isActive !== false;
                  const isSetupCompleted = !!o.bookingSlug;
                  const mappedUsers = users.filter(u => u.outlet_id === o.outletID);
                  const primaryAdmin = mappedUsers.find(u => u.role === 'admin' || u.role === 'platform_admin');
                  const lastActivity = o.updatedAt || o.createdAt;

                  return (
                    <tr 
                      key={o.outletID} 
                      onClick={() => openOutletDrawer(o)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-950 group-hover:text-violet-600 transition-colors">{o.name || o.settings?.shopName || '—'}</p>
                        <p className="font-mono text-[10px] text-slate-400 mt-0.5">{o.outletID}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900">{primaryAdmin?.display_name || '—'}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">{primaryAdmin?.email || 'No email'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 font-medium bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full text-[10px]">
                          {mappedUsers.length} accounts
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          isSetupCompleted 
                            ? 'bg-sky-50 text-sky-700 border-sky-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isSetupCompleted ? 'Completed' : 'Pending Setup'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-[10px]">{formatDate(lastActivity, false)}</td>
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-[10px]">{formatDate(o.createdAt, false)}</td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRemoteView(o.outletID)}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[10px] shadow-sm transition-colors"
                          >
                            Remote View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTogglePortalAccess(o)}
                            className={`px-2.5 py-1 rounded font-semibold text-[10px] border transition-colors ${
                              isActive 
                                ? 'border-rose-200 text-rose-700 hover:bg-rose-50' 
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {isActive ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Right-Side Detail Drawer / Mobile Full-screen sheet */}
      {selectedOutlet && (
        <>
          {/* Backdrop */}
          {drawerOpen && (
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setDrawerOpen(false)}
            />
          )}

          {/* Drawer Element */}
          <div
            className={`fixed top-0 right-0 h-full w-full sm:max-w-2xl bg-white border-l border-slate-200 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
              drawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-bold tracking-widest text-violet-600">Workspace Inspector</span>
                <h3 className="text-base font-bold text-slate-950 truncate mt-0.5">
                  {selectedOutlet.name || selectedOutlet.settings?.shopName || 'Outlet Details'}
                </h3>
                <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">ID: {selectedOutlet.outletID}</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-slate-100 text-xs px-2 bg-slate-50/50">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'accounts', label: 'Accounts' },
                { id: 'access', label: 'Access' },
                { id: 'activity', label: 'Activity Trail' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-3 border-b-2 font-medium transition-all ${
                    activeTab === tab.id
                      ? 'border-violet-600 text-violet-700 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable Content Frame */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {activeTab === 'overview' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Primary Administrator</p>
                      <p className="font-semibold text-slate-900 mt-1">
                        {users.find(u => u.outlet_id === selectedOutlet.outletID && (u.role === 'admin' || u.role === 'platform_admin'))?.email || 'No primary admin assigned'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Booking Path</p>
                      <p className="font-semibold text-slate-900 mt-1">
                        {selectedOutlet.bookingSlug ? `/book/${selectedOutlet.bookingSlug}` : 'Not configured'}
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-100 rounded-lg divide-y divide-slate-100">
                    <div className="grid grid-cols-3 p-3">
                      <span className="text-slate-400 font-medium">Business Email</span>
                      <span className="col-span-2 font-medium text-slate-800">{selectedOutlet.email || '—'}</span>
                    </div>
                    <div className="grid grid-cols-3 p-3">
                      <span className="text-slate-400 font-medium">Business Phone</span>
                      <span className="col-span-2 font-medium text-slate-800">{selectedOutlet.phone || selectedOutlet.phoneNumber || '—'}</span>
                    </div>
                    <div className="grid grid-cols-3 p-3">
                      <span className="text-slate-400 font-medium">Address</span>
                      <span className="col-span-2 font-medium text-slate-800">
                        {selectedOutlet.addressDisplay || (selectedOutlet.address 
                          ? `${selectedOutlet.address.street}, ${selectedOutlet.address.city}, ${selectedOutlet.address.state} ${selectedOutlet.address.zipCode}` 
                          : '—')}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 p-3">
                      <span className="text-slate-400 font-medium">Timezone</span>
                      <span className="col-span-2 font-mono text-[11px] text-slate-600">{selectedOutlet.timezone || '—'}</span>
                    </div>
                    <div className="grid grid-cols-3 p-3">
                      <span className="text-slate-400 font-medium">Joined Date</span>
                      <span className="col-span-2 font-mono text-[11px] text-slate-600">{formatDate(selectedOutlet.createdAt, true)}</span>
                    </div>
                    <div className="grid grid-cols-3 p-3">
                      <span className="text-slate-400 font-medium">Last Activity</span>
                      <span className="col-span-2 font-mono text-[11px] text-slate-600">{formatDate(selectedOutlet.updatedAt || selectedOutlet.createdAt, true)}</span>
                    </div>
                  </div>

                  {/* Booking Links Utility */}
                  <div className="bg-violet-50/50 p-4 border border-violet-100 rounded-xl space-y-3">
                    <h4 className="font-semibold text-violet-950 text-xs">Customer Booking Link</h4>
                    <p className="text-[11px] text-slate-500">
                      Copy the custom booking path or test the client-facing scheduler screen.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const slug = selectedOutlet.bookingSlug || selectedOutlet.outletID;
                          navigator.clipboard.writeText(`https://bookglow-83fb3.web.app/book/${slug}`);
                          alert('Booking link copied to clipboard!');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors font-semibold shadow-sm"
                      >
                        Copy URL
                      </button>
                      <a
                        href={`https://bookglow-83fb3.web.app/book/${selectedOutlet.bookingSlug || selectedOutlet.outletID}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors shadow-sm text-center"
                      >
                        Preview Booking Page
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'accounts' && (
                <div className="space-y-5 text-xs">
                  {/* Account Invite Panel */}
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3">
                    <h4 className="font-semibold text-slate-800">Invite New Workspace Account</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="email"
                        placeholder="user@merchant.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="sm:col-span-2 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:bg-white bg-white"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as any)}
                        className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        <option value="admin">ADMIN</option>
                        <option value="manager">MANAGER</option>
                        <option value="cashier">CASHIER</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAuthAction('invite')}
                      className="px-3 py-1.5 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 transition-colors shadow-sm"
                    >
                      Invite Account
                    </button>
                  </div>

                  {/* Accounts List */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-800">Assigned User Accounts</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                      {users.filter(u => u.outlet_id === selectedOutlet.outletID).length === 0 ? (
                        <p className="p-4 text-center text-slate-400">No users mapped to this workspace.</p>
                      ) : (
                        users
                          .filter(u => u.outlet_id === selectedOutlet.outletID)
                          .map((u) => {
                            const isOwner = u.role === 'admin' || u.role === 'platform_admin';
                            
                            return (
                              <div key={u.uid} className="p-3.5 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-semibold text-slate-900">{u.display_name || 'No Name'}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{u.email}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                      u.role === 'admin' || u.role === 'platform_admin'
                                        ? 'bg-violet-100 text-violet-800'
                                        : u.role === 'manager'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}>
                                      {String(u.role).toUpperCase()}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5 pt-1.5">
                                  {/* Change Role Trigger */}
                                  <select
                                    value={u.role || 'cashier'}
                                    onChange={(e) => handleUserRoleChange(u, e.target.value)}
                                    className="px-2 py-1 border border-slate-200 rounded bg-slate-50 text-[10px] focus:outline-none"
                                  >
                                    <option value="admin">ADMIN</option>
                                    <option value="manager">MANAGER</option>
                                    <option value="cashier">CASHIER</option>
                                  </select>

                                  {/* Suspend triggers */}
                                  <button
                                    type="button"
                                    onClick={() => handleAuthAction('suspend', u)}
                                    className="px-2 py-1 rounded border border-slate-200 hover:bg-rose-50 text-rose-700 text-[10px] transition-colors"
                                  >
                                    Suspend
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleAuthAction('reset_password', u)}
                                    className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] transition-colors"
                                  >
                                    Password Reset
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleAuthAction('revoke_sessions', u)}
                                    className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] transition-colors"
                                  >
                                    Revoke Sessions
                                  </button>

                                  {/* Demote / Transfer Ownership */}
                                  {!isOwner && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentOwner = users.find(owner => owner.outlet_id === selectedOutlet.outletID && (owner.role === 'admin' || owner.role === 'platform_admin'));
                                        if (currentOwner) {
                                          handleTransferOwnership(currentOwner, u);
                                        } else {
                                          alert('No current owner admin is mapped to transfer from.');
                                        }
                                      }}
                                      className="px-2 py-1 rounded border border-slate-200 text-violet-700 hover:bg-violet-50 text-[10px] font-semibold transition-colors"
                                    >
                                      Make Owner
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveUser(u)}
                                    className="px-2 py-1 rounded border border-slate-200 text-rose-600 hover:bg-rose-50 text-[10px] font-semibold transition-colors ml-auto"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'access' && (
                <div className="space-y-6 text-xs">
                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 p-1">
                    {/* Portal Access Control */}
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">Portal Security Access</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          When suspended, all workspace users are immediately blocked from logging into the dashboard.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePortalAccess(selectedOutlet)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          selectedOutlet.isActive !== false
                            ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {selectedOutlet.isActive !== false ? 'Suspend Portal' : 'Restore Access'}
                      </button>
                    </div>

                    {/* New Account Configuration */}
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">Allow Workspace Registration</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Configure whether standard staff or admins are allowed to register additional workspace accounts.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleAllowNewAccounts(selectedOutlet, !selectedOutlet.settings?.allowNewAccounts)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          selectedOutlet.settings?.allowNewAccounts !== false
                            ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                        }`}
                      >
                        {selectedOutlet.settings?.allowNewAccounts !== false ? 'Block Signups' : 'Allow Signups'}
                      </button>
                    </div>

                    {/* Account Limits */}
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">Optional Account Limits</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Restricts maximum active login accounts for this outlet. (Disabled - Commercial approval pending).
                        </p>
                      </div>
                      <input
                        type="number"
                        disabled
                        value={3}
                        className="w-16 px-2.5 py-1.5 border border-slate-200 bg-slate-50 text-slate-400 rounded-lg text-center font-semibold"
                      />
                    </div>
                  </div>

                  {/* Remote Inspection Panel */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <h4 className="font-semibold text-slate-800 text-xs">Inspect Outlet Session</h4>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Temporarily impersonate the admin permissions of this outlet to review catalog settings, POS history, staff pin configurations, and sales reports directly.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemoteView(selectedOutlet.outletID)}
                      className="px-4 py-2 bg-slate-900 text-white font-semibold hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
                    >
                      Enter Remote Workspace View
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-4 text-xs">
                  <h4 className="font-semibold text-slate-800">Recent Security Activity Audit</h4>
                  {outletEvents.length === 0 ? (
                    <div className="p-8 border border-slate-100 rounded-xl text-center text-slate-400">
                      No security audit events recorded for this outlet yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {outletEvents.map((evt) => (
                        <div key={evt.id} className="p-3 border border-slate-100 rounded-lg bg-slate-50 space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-slate-900 capitalize">{evt.action}</span>
                            <span className="text-[9px] font-mono text-slate-400">{formatDate(evt.timestamp, true)}</span>
                          </div>
                          <p className="text-[10px] text-slate-500">{evt.affectedTarget}</p>
                          <div className="text-[9px] text-slate-400 flex justify-between items-center pt-1 border-t border-slate-200/40">
                            <span>Actor: {evt.actor}</span>
                            {evt.reason && <span className="italic text-slate-500">Reason: {evt.reason}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Confirmation reason dialog / modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !actionBusy && setConfirmModal(null)} />
          
          <form 
            onSubmit={handleConfirmSubmit}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 relative z-10 space-y-4 shadow-2xl font-sans"
          >
            <div>
              <h4 className="text-sm font-bold text-slate-950 uppercase tracking-wide">
                Confirm Security Action
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Target: <strong className="text-slate-900">{confirmModal.targetName}</strong>
              </p>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 leading-relaxed">
              <p className="font-semibold">Consequence / Impact Warning:</p>
              <p className="mt-1">{confirmModal.consequence}</p>
            </div>

            {confirmModal.reasonRequired && (
              <div className="space-y-1.5">
                <label htmlFor="confirm-reason" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Reason for security audit log *
                </label>
                <input
                  id="confirm-reason"
                  type="text"
                  required
                  placeholder="e.g. Requested by customer / Non-payment suspension"
                  value={confirmReason}
                  onChange={(e) => setConfirmReason(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
            )}

            {confirmError && (
              <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                {confirmError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => {
                  setConfirmModal(null);
                  setConfirmReason('');
                  setConfirmError(null);
                }}
                className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionBusy}
                className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
              >
                {actionBusy && (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Confirm Action
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SuperAdminSubscribers;
