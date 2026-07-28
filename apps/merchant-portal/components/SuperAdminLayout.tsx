import React from 'react';
import { Activity, Building2, CreditCard, FileClock, HeartPulse, LayoutDashboard, LogOut, ShieldCheck, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { PortalAuthUser } from '../services/authService';
import { NetworkStatusBanner } from './ui';

interface SuperAdminLayoutProps {
  user: PortalAuthUser | null;
  onLogout: () => void | Promise<void>;
  children: React.ReactNode;
}

const navigation = [
  { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/subscribers', label: 'Outlets & Access', icon: Building2 },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/admin/users', label: 'Platform Users', icon: Users },
  { to: '/admin/health', label: 'System Health', icon: HeartPulse },
  { to: '/admin/audit', label: 'Audit Log', icon: FileClock },
];

const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({ user, onLogout, children }) => (
  <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-[#171322] text-white lg:flex">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-ui-md bg-[var(--brand)] shadow-ui-sm">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold">Bookglow Control</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Platform operations</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Platform navigation">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-ui-md px-3 text-sm font-semibold transition-colors ${
                isActive ? 'bg-white/12 text-white' : 'text-white/65 hover:bg-white/7 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 rounded-ui-md bg-white/7 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-[var(--success)]" aria-hidden />
            Platform administrator
          </div>
          <p className="mt-1 truncate text-[11px] text-white/55" title={user?.email || undefined}>{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={() => onLogout()}
          className="flex min-h-10 w-full items-center justify-center gap-2 rounded-ui-md border border-white/15 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Log out
        </button>
      </div>
    </aside>

    <div className="lg:pl-64">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-surface)_92%,transparent)] backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-bold">Bookglow Control</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Platform administrator</p>
          </div>
          <Activity className="h-5 w-5 text-[var(--brand)]" aria-hidden />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3" aria-label="Platform navigation">
          {navigation.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-ui-sm px-3 py-2 text-xs font-semibold ${
                  isActive ? 'bg-[var(--brand-soft)] text-[var(--brand-deep)]' : 'text-[var(--text-secondary)]'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="min-w-0">
        <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <NetworkStatusBanner />
          {children}
        </div>
      </main>
    </div>
  </div>
);

export default SuperAdminLayout;
