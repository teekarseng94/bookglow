import React from 'react';
import { NavLink } from 'react-router-dom';

interface SuperAdminLayoutProps {
  user: any;
  onLogout: () => Promise<void> | void;
  children: React.ReactNode;
}

const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({ user, onLogout, children }) => {
  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800">
          <h1 className="text-lg font-black tracking-tight text-white">
            ZenFlow Admin
          </h1>
          <p className="text-[11px] text-slate-400 mt-1">
            Super Admin · {user?.email}
          </p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span className="text-xs font-semibold uppercase tracking-wide">
              Dashboard
            </span>
          </NavLink>
          <NavLink
            to="/admin/subscribers"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span className="text-xs font-semibold uppercase tracking-wide">
              Subscribers
            </span>
          </NavLink>
        </nav>
        <div className="px-4 py-3 border-t border-slate-800 text-[11px] text-slate-500 space-y-3">
          <div>Remote Control Mode</div>
          <button
            type="button"
            onClick={() => onLogout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
          >
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-slate-950 text-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-6">{children}</div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;

