import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icons } from '../constants';
import type { UserRole } from '../contexts/UserContext';
import type { PortalAuthUser } from '../services/authService';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin?: boolean;
  shopName: string;
  user?: PortalAuthUser | null;
  onLogout?: () => void;
  outletId?: string | null;
  outletName?: string | null;
  role?: UserRole | null;
}

type NavItem = {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ReactNode;
};

type NavGroup = {
  label: string;
  ids: string[];
};

const MoreHorizontalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="5" cy="12" r="1.75" />
    <circle cx="12" cy="12" r="1.75" />
    <circle cx="19" cy="12" r="1.75" />
  </svg>
);

const pageTitles: Record<string, string> = {
  dashboard: 'Today',
  pos: 'Point of Sale',
  schedule: 'Schedule',
  appointments: 'Schedule',
  member: 'Members',
  menu: 'Menu & Inventory',
  'sales-reports': 'Sales Reports',
  transactions: 'Sales History',
  finance: 'Expenses',
  marketing: 'Marketing',
  staff: 'Staff & Team',
  settings: 'Settings',
  report: 'Report',
};

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab: _setActiveTab,
  isAdmin,
  shopName,
  user,
  onLogout,
  outletId,
  outletName,
  role,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isScheduleRoute = /^\/(schedule|appointments)(\/|$)/.test(location.pathname);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileProfileMenu, setShowMobileProfileMenu] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
      if (mobileProfileMenuRef.current && !mobileProfileMenuRef.current.contains(target)) {
        setShowMobileProfileMenu(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        if ((event.target as HTMLElement).closest('[data-more-menu-trigger]')) return;
        setIsMoreMenuOpen(false);
      }
    };

    if (showProfileMenu || showMobileProfileMenu || isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu, showMobileProfileMenu, isMoreMenuOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMoreMenuOpen(false);
        setShowProfileMenu(false);
        setShowMobileProfileMenu(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setIsMoreMenuOpen(false);
    setShowProfileMenu(false);
    setShowMobileProfileMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    const open = () => setIsMoreMenuOpen(true);
    window.addEventListener('bookglow:open-more-menu', open);
    return () => window.removeEventListener('bookglow:open-more-menu', open);
  }, []);

  const getUserInitials = () => {
    if (user?.displayName) {
      return user.displayName
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) return user.email[0].toUpperCase();
    return role === 'admin' ? 'AD' : 'CA';
  };

  const getUserDisplayName = () => user?.displayName || user?.email || (role === 'admin' ? 'Administrator' : 'Cashier');
  const roleTitle = role === 'admin' ? 'Administrator' : 'Cashier';

  const allNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Today', icon: <Icons.Dashboard /> },
    { id: 'schedule', label: 'Schedule', icon: <Icons.Calendar /> },
    { id: 'pos', label: 'Point of Sale', shortLabel: 'POS', icon: <Icons.POS /> },
    { id: 'member', label: 'Members', icon: <Icons.Clients /> },
    { id: 'menu', label: 'Menu & Inventory', shortLabel: 'Menu', icon: <Icons.Services /> },
    { id: 'sales-reports', label: 'Sales Reports', shortLabel: 'Reports', icon: <Icons.Reports /> },
    { id: 'transactions', label: 'Sales History', icon: <Icons.Finance /> },
    { id: 'finance', label: 'Expenses', icon: <Icons.Finance /> },
    { id: 'marketing', label: 'Marketing', icon: <Icons.Marketing /> },
    { id: 'staff', label: 'Staff & Team', icon: <Icons.Staff /> },
    { id: 'settings', label: 'Settings', icon: <Icons.Settings /> },
    { id: 'report', label: 'Report', icon: <Icons.Flag /> },
  ];

  const cashierTabIds = new Set(['pos', 'member', 'menu', 'sales-reports']);
  const navItems = role === 'admin' ? allNavItems : allNavItems.filter((item) => cashierTabIds.has(item.id));

  const navGroups: NavGroup[] = role === 'admin'
    ? [
        { label: 'Workday', ids: ['dashboard', 'schedule', 'pos'] },
        { label: 'Customers', ids: ['member', 'marketing'] },
        { label: 'Business', ids: ['menu', 'sales-reports', 'transactions', 'finance', 'staff'] },
        { label: 'Workspace', ids: ['settings', 'report'] },
      ]
    : [
        { label: 'Workday', ids: ['pos'] },
        { label: 'Customers', ids: ['member'] },
        { label: 'Business', ids: ['menu', 'sales-reports'] },
      ];

  const groupedNavItems = navGroups
    .map((group) => ({ ...group, items: group.ids.map((id) => navItems.find((item) => item.id === id)).filter(Boolean) as NavItem[] }))
    .filter((group) => group.items.length > 0);

  const mobileBottomNavItems = role === 'admin'
    ? allNavItems.filter((item) => ['dashboard', 'schedule', 'pos', 'member'].includes(item.id))
    : allNavItems.filter((item) => ['pos', 'member', 'menu', 'sales-reports'].includes(item.id));

  const mobilePrimaryIds = new Set(mobileBottomNavItems.map((item) => item.id));
  const tabForBottomNav = location.pathname.startsWith('/member-details/') ? 'member' : activeTab;
  const moreTabActive = !mobilePrimaryIds.has(tabForBottomNav);
  const moreNavItems = navItems.filter((item) => !mobilePrimaryIds.has(item.id));

  const currentPageTitle = location.pathname.startsWith('/member-details/')
    ? 'Member details'
    : pageTitles[activeTab] || activeTab.replaceAll('-', ' ');

  const resolvedOutletName = outletName || shopName || outletId || 'Bookglow';
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' }),
    []
  );

  const handleLogout = () => {
    setShowProfileMenu(false);
    setShowMobileProfileMenu(false);
    onLogout?.();
  };

  const mobileBottomNavItemClass = (isActive: boolean) =>
    `bookglow-mobile-nav-item ${isActive ? 'bookglow-mobile-nav-item--active' : ''}`;

  const ProfileMenu = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="bookglow-profile-menu" role="menu" aria-label="User menu">
      <div className="bookglow-profile-menu__header">
        <div className="bookglow-profile-menu__avatar">{getUserInitials()}</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{getUserDisplayName()}</p>
          <p className="truncate text-xs text-slate-500">{roleTitle}</p>
        </div>
      </div>
      {role === 'admin' && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            navigate('/settings');
            setShowProfileMenu(false);
            setShowMobileProfileMenu(false);
          }}
          className="bookglow-profile-menu__item"
        >
          <Icons.Settings />
          Settings
        </button>
      )}
      {onLogout && (
        <button type="button" role="menuitem" onClick={handleLogout} className="bookglow-profile-menu__item bookglow-profile-menu__item--danger">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      )}
      {mobile && <p className="px-4 pb-3 pt-1 text-[11px] text-slate-400">{user?.email}</p>}
    </div>
  );

  return (
    <div className="bookglow-app-shell">
      <aside className="bookglow-sidebar hidden lg:flex" aria-label="Bookglow navigation">
        <div className="bookglow-sidebar__brand">
          <div className="bookglow-brand-mark" aria-hidden>✦</div>
          <div className="min-w-0">
            <p className="bookglow-wordmark">Bookglow</p>
            <p className="truncate text-xs text-slate-500">{resolvedOutletName}</p>
          </div>
        </div>

        <div className="bookglow-sidebar__context">
          <span className="bookglow-status-dot" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-700">{roleTitle} workspace</p>
            <p className="truncate text-[11px] text-slate-400">{todayLabel}</p>
          </div>
        </div>

        <nav className="bookglow-sidebar__nav">
          {groupedNavItems.map((group) => (
            <div key={group.label} className="bookglow-nav-group">
              <p className="bookglow-nav-group__label">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.id}
                    to={`/${item.id}`}
                    className={({ isActive: routeActive }) => `bookglow-nav-link ${routeActive ? 'bookglow-nav-link--active' : ''}`}
                  >
                    <span className="bookglow-nav-link__icon">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="bookglow-sidebar__footer" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu((open) => !open)}
            className="bookglow-sidebar-profile"
            aria-expanded={showProfileMenu}
          >
            <span className="bookglow-sidebar-profile__avatar">{getUserInitials()}</span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-semibold text-slate-800">{getUserDisplayName()}</span>
              <span className="block truncate text-[11px] text-slate-400">{roleTitle}</span>
            </span>
            <svg className={`h-4 w-4 text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showProfileMenu && <ProfileMenu />}
        </div>
      </aside>

      <div className="bookglow-workspace">
        <header className={`${isScheduleRoute ? 'hidden' : 'flex'} bookglow-mobile-header lg:hidden`}>
          {moreNavItems.length > 0 ? (
            <button
              type="button"
              data-more-menu-trigger
              onClick={() => setIsMoreMenuOpen((open) => !open)}
              className="bookglow-icon-button"
              aria-label="Open navigation"
              aria-expanded={isMoreMenuOpen}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          ) : (
            <div className="h-11 w-11" aria-hidden />
          )}

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[11px] font-medium text-slate-400">{resolvedOutletName}</p>
            <h1 className="truncate text-sm font-semibold text-slate-900">{currentPageTitle}</h1>
          </div>

          <div className="relative" ref={mobileProfileMenuRef}>
            <button
              type="button"
              onClick={() => setShowMobileProfileMenu((open) => !open)}
              className="bookglow-mobile-avatar"
              aria-label="Open user menu"
              aria-expanded={showMobileProfileMenu}
            >
              {getUserInitials()}
            </button>
            {showMobileProfileMenu && <ProfileMenu mobile />}
          </div>
        </header>

        <header className="bookglow-desktop-utility hidden lg:flex">
          <div className="min-w-0">
            <p className="bookglow-eyebrow">{resolvedOutletName}</p>
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">{currentPageTitle}</h2>
              {outletId && (
                <span className="bookglow-outlet-pill" title={`Data is loaded and saved for ${outletId}`}>
                  Live outlet
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-sm font-semibold text-slate-700">{roleTitle}</p>
              <p className="text-[11px] text-slate-400">{user?.email || 'Secure session'}</p>
            </div>
            <span className={`bookglow-utility-avatar ${isAdmin ? 'bookglow-utility-avatar--admin' : ''}`}>{getUserInitials()}</span>
          </div>
        </header>

        <main className={`bookglow-main-scroll ${isScheduleRoute ? 'bookglow-main-scroll--schedule' : ''}`}>
          <div className={`bookglow-content-frame ${isScheduleRoute ? 'bookglow-content-frame--schedule' : ''}`}>
            <div className="bookglow-page">{children}</div>
          </div>
        </main>

        <nav className="bookglow-mobile-nav lg:hidden" aria-label="Primary navigation">
          <div className="bookglow-mobile-nav__inner">
            {mobileBottomNavItems.map((item) => (
              <NavLink
                key={item.id}
                to={`/${item.id}`}
                onClick={() => setIsMoreMenuOpen(false)}
                className={({ isActive: routeActive }) =>
                  mobileBottomNavItemClass(routeActive || (item.id === 'member' && location.pathname.startsWith('/member-details/')))
                }
              >
                <span className="bookglow-mobile-nav-item__icon">{item.icon}</span>
                <span className="bookglow-mobile-nav-item__label">{item.shortLabel || item.label}</span>
              </NavLink>
            ))}
            {moreNavItems.length > 0 && (
              <button
                type="button"
                data-more-menu-trigger
                onClick={() => setIsMoreMenuOpen((open) => !open)}
                className={mobileBottomNavItemClass(moreTabActive)}
                aria-label="More pages"
                aria-expanded={isMoreMenuOpen}
              >
                <span className="bookglow-mobile-nav-item__icon"><MoreHorizontalIcon /></span>
                <span className="bookglow-mobile-nav-item__label">More</span>
              </button>
            )}
          </div>
        </nav>

        {isMoreMenuOpen && moreNavItems.length > 0 && (
          <>
            <button type="button" className="bookglow-more-backdrop lg:hidden" aria-label="Close navigation" onClick={() => setIsMoreMenuOpen(false)} />
            <div ref={moreMenuRef} className="bookglow-more-sheet lg:hidden" role="dialog" aria-modal="true" aria-label="More pages">
              <div className="bookglow-more-sheet__handle" aria-hidden />
              <div className="bookglow-more-sheet__header">
                <div>
                  <p className="bookglow-eyebrow">Bookglow workspace</p>
                  <h2 className="text-lg font-semibold text-slate-900">More pages</h2>
                </div>
                <button type="button" onClick={() => setIsMoreMenuOpen(false)} className="bookglow-icon-button" aria-label="Close navigation">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bookglow-more-sheet__grid">
                {moreNavItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={`/${item.id}`}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className={({ isActive: routeActive }) => `bookglow-more-link ${routeActive ? 'bookglow-more-link--active' : ''}`}
                  >
                    <span className="bookglow-more-link__icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Layout;
