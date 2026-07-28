import React from 'react';
import { NavLink } from 'react-router-dom';
import { PlatformBanner } from './admin/PlatformBanner';

interface SuperAdminLayoutProps {
  user: any;
  onLogout: () => Promise<void> | void;
  children: React.ReactNode;
}

/**
 * Platform Super Admin shell — dark, distinct from merchant Layout.
 * Only mounted when App gates `isSuperAdmin`; never shown to ordinary merchants.
 */
const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({ user, onLogout, children }) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100">
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-slate-800">
          <p className="m-caption font-bold uppercase tracking-widest text-emerald-400">Platform</p>
          <h1 className="text-lg font-bold tracking-tight text-white mt-0.5">Bookglow Admin</h1>
          <p className="text-xs text-slate-400 mt-1 truncate" title={user?.email || undefined}>
            Super Admin · {user?.email}
          </p>
        </div>
        <nav className="flex md:flex-col gap-1 px-3 py-3 text-sm overflow-x-auto md:overflow-visible" aria-label="Platform navigation">
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2.5 rounded-lg whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span className="text-xs font-semibold uppercase tracking-wide">Dashboard</span>
          </NavLink>
          <NavLink
            to="/admin/subscribers"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2.5 rounded-lg whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span className="text-sm font-medium">Subscribers</span>
          </NavLink>
        </nav>
        <div className="mt-auto px-4 py-3 border-t border-slate-800 m-caption text-slate-500 space-y-3">
          <div className="font-semibold text-amber-400/90 uppercase tracking-wide">Remote Control Mode</div>
          <button
            type="button"
            onClick={() => onLogout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-slate-950 text-slate-50 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-4">
          <PlatformBanner />
          {children}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;
