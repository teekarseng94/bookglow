import React from 'react';
import { NavLink } from 'react-router-dom';
import { PlatformBanner } from './admin/PlatformBanner';

interface SuperAdminLayoutProps {
  user: any;
  onLogout: () => Promise<void> | void;
  children: React.ReactNode;
}

/**
 * Platform Super Admin shell — bright, premium operational UI.
 * Only mounted when App gates `isSuperAdmin`; never shown to ordinary merchants.
 */
const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({ user, onLogout, children }) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 font-sans">
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">Platform Console</p>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 mt-0.5">Bookglow Control</h1>
          <p className="text-xs text-slate-500 mt-1 truncate" title={user?.email || undefined}>
            {user?.email}
          </p>
        </div>
        
        <nav className="flex md:flex-col gap-1 px-3 py-4 text-sm overflow-x-auto md:overflow-visible" aria-label="Platform navigation">
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2.5 rounded-lg whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-violet-50 text-violet-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <span className="text-sm font-medium">Overview</span>
          </NavLink>
          <NavLink
            to="/admin/subscribers"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2.5 rounded-lg whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-violet-50 text-violet-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <span className="text-sm font-medium">Outlets & Access</span>
          </NavLink>
        </nav>
        
        <div className="mt-auto px-4 py-4 border-t border-slate-100 text-[11px] text-slate-400 space-y-3">
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-violet-600 animate-pulse" />
            <span className="font-semibold uppercase tracking-wider text-[9px]">Super Admin Mode</span>
          </div>
          <button
            type="button"
            onClick={() => onLogout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-slate-50 text-slate-800 min-w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          <PlatformBanner title="Bookglow Platform Console">
            Bookglow Platform Console — changes here affect merchant workspace access and credentials.
          </PlatformBanner>
          {children}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;
