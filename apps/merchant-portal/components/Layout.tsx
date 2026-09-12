import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icons } from '../constants';
import type { UserRole } from '../contexts/UserContext';
import type { PortalAuthUser } from '../services/authService';
import { isTabAllowed } from '../utils/permissions';
import { NetworkStatusBanner } from './ui';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin?: boolean;
  isPlatformAdmin?: boolean;
  shopName: string;
  user?: PortalAuthUser | null;
  onLogout?: () => void;
  outletId?: string | null;
  outletName?: string | null;
  role?: UserRole | null;
  memberCount?: number;
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

const LogoutIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
  finance: 'Finance',
  marketing: 'Marketing',
  staff: 'Staff & Team',
  settings: 'Settings',
  report: 'Report',
};

const LS_COLLAPSED_KEY = 'bookglow_sidebar_collapsed';

function readCollapsedPref(): boolean {
  try {
    return window.localStorage.getItem(LS_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}
function writeCollapsedPref(val: boolean) {
  try {
    window.localStorage.setItem(LS_COLLAPSED_KEY, String(val));
  } catch { /* ignore */ }
}

/** Compute the popup position anchored to the trigger rect, opening above it */
function computePopupPosition(
  triggerRect: DOMRect,
  popupWidth: number,
  popupHeight: number,
  collapsed: boolean,
) {
  const MARGIN = 12;
  const GAP = 8;

  if (collapsed) {
    // Open to the right of the sidebar icon rail
    const left = triggerRect.right + GAP;
    let top = triggerRect.bottom - popupHeight;
    top = Math.max(MARGIN, Math.min(top, window.innerHeight - popupHeight - MARGIN));
    return { top, left };
  } else {
    // Open above the profile button, inside the sidebar, with 12px side margins
    const left = triggerRect.left + MARGIN;
    const right = triggerRect.right - MARGIN;
    const width = Math.min(popupWidth, right - left);
    let top = triggerRect.top - popupHeight - GAP;
    top = Math.max(MARGIN, top);
    return { top, left, width };
  }
}

/** A nav link that shows a tooltip in collapsed mode */
const TooltipNavLink: React.FC<{
  item: NavItem;
  collapsed: boolean;
  onClick?: () => void;
}> = ({ item, collapsed, onClick }) => {
  const [showTip, setShowTip] = useState(false);
  const [tipPos, setTipPos] = useState({ top: 0, left: 0 });
  const linkRef = useRef<HTMLAnchorElement>(null);

  const showTooltip = useCallback(() => {
    if (!collapsed) return;
    const rect = linkRef.current?.getBoundingClientRect();
    if (rect) {
      setTipPos({ top: rect.top + rect.height / 2 - 12, left: rect.right + 8 });
      setShowTip(true);
    }
  }, [collapsed]);

  const hideTooltip = useCallback(() => setShowTip(false), []);

  return (
    <>
      <NavLink
        ref={linkRef}
        to={`/${item.id}`}
        className={({ isActive: routeActive }) =>
          `bookglow-nav-link ${routeActive ? 'bookglow-nav-link--active' : ''}`
        }
        title={collapsed ? item.label : undefined}
        aria-label={collapsed ? item.label : undefined}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onClick={() => { hideTooltip(); onClick?.(); }}
      >
        <span className="bookglow-nav-link__icon">{item.icon}</span>
        {!collapsed && <span className="bookglow-nav-link__label truncate">{item.label}</span>}
      </NavLink>

      {/* Portal-style tooltip rendered at window level */}
      {collapsed && showTip && (
        <div
          className="bookglow-tooltip bookglow-tooltip--visible"
          role="tooltip"
          style={{ top: tipPos.top, left: tipPos.left }}
          aria-hidden
        >
          {item.label}
        </div>
      )}
    </>
  );
};

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab: _setActiveTab,
  isAdmin,
  isPlatformAdmin,
  shopName,
  user,
  onLogout,
  outletId,
  outletName,
  role,
  memberCount,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isScheduleRoute = /^\/(schedule|appointments)(\/|$)/.test(location.pathname);

  // ── Desktop sidebar collapse ─────────────────────────────────────────────
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsedPref);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsedPref(next);
      return next;
    });
  }, []);

  // ── Profile popups ───────────────────────────────────────────────────────
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileProfileMenu, setShowMobileProfileMenu] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // For fixed-position desktop popup
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const desktopPopupRef = useRef<HTMLDivElement>(null);
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  /** Position the fixed desktop popup anchored to the trigger button */
  const positionPopup = useCallback(() => {
    const btn = profileBtnRef.current;
    const popup = desktopPopupRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const popupW = popup?.offsetWidth ?? 256;
    const popupH = popup?.offsetHeight ?? 160;
    const pos = computePopupPosition(rect, popupW, popupH, collapsed);
    setPopupStyle({
      top: pos.top,
      left: pos.left,
      ...(pos.width ? { width: pos.width } : {}),
    });
  }, [collapsed]);

  // Reposition on every open / resize
  useLayoutEffect(() => {
    if (!showProfileMenu) return;
    positionPopup();
    const onResize = () => positionPopup();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [showProfileMenu, positionPopup]);

  // ── Click-outside & Escape ───────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        showProfileMenu &&
        desktopPopupRef.current &&
        !desktopPopupRef.current.contains(target) &&
        profileBtnRef.current &&
        !profileBtnRef.current.contains(target)
      ) {
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
        if (showProfileMenu) { setShowProfileMenu(false); profileBtnRef.current?.focus(); }
        setIsMoreMenuOpen(false);
        setShowMobileProfileMenu(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showProfileMenu]);

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

  // ── User helpers ─────────────────────────────────────────────────────────
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
    return role === 'admin' ? 'AD' : role === 'manager' ? 'MN' : 'CA';
  };

  const getUserDisplayName = () =>
    user?.displayName ||
    user?.email ||
    (role === 'admin' ? 'Administrator' : role === 'manager' ? 'Manager' : 'Cashier');

  const roleTitle =
    role === 'admin' ? 'Administrator' : role === 'manager' ? 'Manager' : 'Cashier';

  // ── Navigation data ───────────────────────────────────────────────────────
  const allNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Today', icon: <Icons.Dashboard /> },
    { id: 'schedule', label: 'Schedule', icon: <Icons.Calendar /> },
    { id: 'pos', label: 'Point of Sale', shortLabel: 'POS', icon: <Icons.POS /> },
    { id: 'member', label: 'Members', icon: <Icons.Clients /> },
    { id: 'menu', label: 'Menu & Inventory', shortLabel: 'Menu', icon: <Icons.Services /> },
    { id: 'sales-reports', label: 'Sales Reports', shortLabel: 'Reports', icon: <Icons.Reports /> },
    { id: 'transactions', label: 'Sales History', icon: <Icons.Finance /> },
    { id: 'finance', label: 'Finance', icon: <Icons.Finance /> },
    { id: 'marketing', label: 'Marketing', icon: <Icons.Marketing /> },
    { id: 'staff', label: 'Staff & Team', icon: <Icons.Staff /> },
    { id: 'settings', label: 'Settings', icon: <Icons.Settings /> },
    { id: 'report', label: 'Report', icon: <Icons.Flag /> },
  ];

  const navGroupsConfig: NavGroup[] = [
    { label: 'Workday', ids: ['dashboard', 'schedule', 'pos'] },
    { label: 'Customers', ids: ['member', 'marketing'] },
    { label: 'Business', ids: ['menu', 'sales-reports', 'transactions', 'finance', 'staff'] },
    { label: 'Workspace', ids: ['settings', 'report'] },
  ];

  const navItems = allNavItems.filter((item) => isTabAllowed(role, item.id));

  const navGroups = navGroupsConfig
    .map((group) => ({
      ...group,
      ids: group.ids.filter((id) => isTabAllowed(role, id)),
    }))
    .filter((group) => group.ids.length > 0);

  const groupedNavItems = navGroups
    .map((group) => ({
      ...group,
      items: group.ids
        .map((id) => navItems.find((item) => item.id === id))
        .filter(Boolean) as NavItem[],
    }))
    .filter((group) => group.items.length > 0);

  const mobileBottomNavItems =
    role === 'admin'
      ? allNavItems.filter((item) => ['dashboard', 'schedule', 'pos', 'member'].includes(item.id))
      : role === 'manager'
      ? allNavItems.filter((item) => ['schedule', 'pos', 'member', 'staff'].includes(item.id))
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
    [],
  );

  const handleLogout = () => {
    setShowProfileMenu(false);
    setShowMobileProfileMenu(false);
    onLogout?.();
  };

  const closeDesktopProfileMenu = () => {
    setShowProfileMenu(false);
    profileBtnRef.current?.focus();
  };

  const mobileBottomNavItemClass = (isActive: boolean) =>
    `bookglow-mobile-nav-item ${isActive ? 'bookglow-mobile-nav-item--active' : ''}`;

  // ── Desktop profile popup (fixed-position) ───────────────────────────────
  const DesktopProfileMenu = () => (
    <div
      ref={desktopPopupRef}
      className="bookglow-profile-menu"
      style={popupStyle}
      role="dialog"
      aria-label="User menu"
      aria-modal="false"
    >
      {/* Header: avatar + name/email + role */}
      <div className="bookglow-profile-menu__header">
        <div className="bookglow-profile-menu__avatar">{getUserInitials()}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
            {getUserDisplayName()}
          </p>
          {user?.email && (
            <span className="bookglow-profile-menu__email">{user.email}</span>
          )}
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{roleTitle}</p>
        </div>
      </div>

      {/* Optional Settings shortcut for admins */}
      {role === 'admin' && (
        <>
          <div className="bookglow-profile-menu__divider" aria-hidden />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              navigate('/settings');
              closeDesktopProfileMenu();
            }}
            className="bookglow-profile-menu__item"
          >
            <Icons.Settings />
            Settings
          </button>
        </>
      )}

      <div className="bookglow-profile-menu__divider" aria-hidden />

      {/* Sign out */}
      {onLogout && (
        <button
          type="button"
          role="menuitem"
          onClick={handleLogout}
          className="bookglow-profile-menu__item bookglow-profile-menu__item--danger"
        >
          <LogoutIcon />
          Sign out
        </button>
      )}
    </div>
  );

  // ── Mobile profile menu (absolute within mobile header) ──────────────────
  const MobileProfileMenu = () => (
    <div className="bookglow-profile-menu" role="menu" aria-label="User menu">
      <div className="bookglow-profile-menu__header">
        <div className="bookglow-profile-menu__avatar">{getUserInitials()}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {getUserDisplayName()}
          </p>
          {user?.email && (
            <span className="bookglow-profile-menu__email">{user.email}</span>
          )}
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{roleTitle}</p>
        </div>
      </div>

      {role === 'admin' && (
        <>
          <div className="bookglow-profile-menu__divider" aria-hidden />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              navigate('/settings');
              setShowMobileProfileMenu(false);
            }}
            className="bookglow-profile-menu__item"
          >
            <Icons.Settings />
            Settings
          </button>
        </>
      )}

      <div className="bookglow-profile-menu__divider" aria-hidden />

      {onLogout && (
        <button
          type="button"
          role="menuitem"
          onClick={handleLogout}
          className="bookglow-profile-menu__item bookglow-profile-menu__item--danger"
        >
          <LogoutIcon />
          Sign out
        </button>
      )}
    </div>
  );

  // ── Tooltip-enhanced profile avatar for collapsed sidebar ────────────────
  const [showProfileTip, setShowProfileTip] = useState(false);
  const [profileTipPos, setProfileTipPos] = useState({ top: 0, left: 0 });

  const showAvatarTooltip = useCallback(() => {
    if (!collapsed) return;
    const rect = profileBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setProfileTipPos({ top: rect.top + rect.height / 2 - 12, left: rect.right + 8 });
      setShowProfileTip(true);
    }
  }, [collapsed]);
  const hideAvatarTooltip = useCallback(() => setShowProfileTip(false), []);

  return (
    <div className="bookglow-app-shell">
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside
        id="bookglow-sidebar"
        className={`bookglow-sidebar hidden lg:flex${collapsed ? ' bookglow-sidebar--collapsed' : ''}`}
        aria-label="Bookglow navigation"
        aria-expanded={!collapsed}
      >
        {/* Brand row */}
        {collapsed ? (
          /* ── Collapsed: single 48×48 logo-to-expand button ── */
          <div className="bookglow-sidebar__brand bookglow-sidebar__brand--collapsed">
            <button
              id="sidebar-expand-btn"
              type="button"
              onClick={toggleCollapsed}
              className="bookglow-expand-logo-btn"
              aria-label="Expand sidebar"
              aria-expanded={false}
              aria-controls="bookglow-sidebar"
            >
              {/* Logo layer — visible at rest, hidden on hover/focus */}
              <span className="bookglow-expand-logo-btn__logo" aria-hidden>✦</span>
              {/* Expand icon layer — hidden at rest, visible on hover/focus */}
              <span className="bookglow-expand-logo-btn__icon" aria-hidden>
                <PanelLeftOpen size={24} strokeWidth={1.75} />
              </span>
            </button>
          </div>
        ) : (
          /* ── Expanded: branding + collapse button ── */
          <div className="bookglow-sidebar__brand">
            <div className="bookglow-brand-mark" aria-hidden>✦</div>
            <div className="min-w-0 flex-1">
              <p className="bookglow-wordmark">Bookglow</p>
              <p className="truncate text-xs text-[var(--text-muted)]">{resolvedOutletName}</p>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="bookglow-sidebar__collapse-btn"
              aria-label="Collapse sidebar"
              aria-expanded={true}
              aria-controls="bookglow-sidebar"
            >
              <PanelLeftClose size={22} strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        )}

        {/* Workspace context (hidden when collapsed) */}
        {!collapsed && (
          <div className="bookglow-sidebar__context">
            <span className="bookglow-status-dot" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[var(--text-secondary)]">
                {roleTitle} workspace
              </p>
              <p className="truncate m-shell-meta">{todayLabel}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="bookglow-sidebar__nav" aria-label="Primary navigation">
          {groupedNavItems.map((group) => (
            <div key={group.label} className="bookglow-nav-group">
              {!collapsed && (
                <p className="bookglow-nav-group__label">{group.label}</p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <TooltipNavLink key={item.id} item={item} collapsed={collapsed} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Profile footer */}
        <div className="bookglow-sidebar__footer">
          <button
            ref={profileBtnRef}
            type="button"
            id="sidebar-profile-btn"
            onClick={() => {
              hideAvatarTooltip();
              setShowProfileMenu((open) => !open);
            }}
            className="bookglow-sidebar-profile"
            aria-expanded={showProfileMenu}
            aria-haspopup="dialog"
            aria-label={`User menu — ${getUserDisplayName()}`}
            onMouseEnter={showAvatarTooltip}
            onMouseLeave={hideAvatarTooltip}
            onFocus={showAvatarTooltip}
            onBlur={hideAvatarTooltip}
          >
            <span className="bookglow-sidebar-profile__avatar">{getUserInitials()}</span>
            {!collapsed && (
              <span className="bookglow-sidebar-profile__text min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                  {getUserDisplayName()}
                </span>
                <span className="block truncate m-shell-meta">{roleTitle}</span>
              </span>
            )}
            {!collapsed && (
              <svg
                className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {/* Avatar tooltip in collapsed mode */}
          {collapsed && showProfileTip && !showProfileMenu && (
            <div
              className="bookglow-tooltip bookglow-tooltip--visible"
              role="tooltip"
              style={{ top: profileTipPos.top, left: profileTipPos.left }}
              aria-hidden
            >
              {getUserDisplayName()}
            </div>
          )}
        </div>
      </aside>

      {/* Fixed desktop profile popup — rendered outside sidebar to avoid clipping */}
      {showProfileMenu && <DesktopProfileMenu />}

      {/* ── Main workspace ─────────────────────────────────── */}
      <div className="bookglow-workspace">
        {/* Mobile header */}
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
            <p className="truncate m-shell-meta font-medium">{resolvedOutletName}</p>
            <h1 className="bookglow-mobile-header__title truncate font-semibold text-[var(--text-primary)]">
              {currentPageTitle}
              {activeTab === 'member' && typeof memberCount === 'number' ? (
                <span className="bookglow-mobile-header__count"> · {memberCount.toLocaleString()} members</span>
              ) : null}
            </h1>
          </div>

          <div className="relative" ref={mobileProfileMenuRef}>
            <button
              type="button"
              onClick={() => setShowMobileProfileMenu((open) => !open)}
              className="bookglow-mobile-avatar"
              aria-label="Open user menu"
              aria-expanded={showMobileProfileMenu}
              aria-haspopup="menu"
            >
              {getUserInitials()}
            </button>
            {showMobileProfileMenu && <MobileProfileMenu />}
          </div>
        </header>

        {/* Desktop utility header */}
        <header className="bookglow-desktop-utility hidden lg:flex">
          <div className="min-w-0">
            <p className="bookglow-eyebrow">{resolvedOutletName}</p>
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold tracking-tight text-[var(--text-primary)]">
                {currentPageTitle}
              </h2>
              {outletId && (
                <span
                  className="bookglow-outlet-pill"
                  title={`Data is loaded and saved for ${outletId}`}
                >
                  Live outlet
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-sm font-semibold text-[var(--text-secondary)]">{roleTitle}</p>
              <p className="m-shell-meta">{user?.email || 'Secure session'}</p>
            </div>
            <span className={`bookglow-utility-avatar ${isAdmin ? 'bookglow-utility-avatar--admin' : ''}`}>
              {getUserInitials()}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main
          className={`bookglow-main-scroll ${isScheduleRoute ? 'bookglow-main-scroll--schedule' : ''}`}
        >
          <div className={`bookglow-content-frame ${isScheduleRoute ? 'bookglow-content-frame--schedule' : ''}`}>
            <div className="bookglow-page">
              {(() => {
                const hasOverride =
                  typeof window !== 'undefined' &&
                  !!window.localStorage.getItem('adminOverrideOutletId');
                if (isPlatformAdmin && hasOverride) {
                  return (
                    <div className="mb-4 flex items-center justify-between gap-4 rounded-ui-md border border-[var(--brand-border)] bg-[var(--warning-soft)] p-3 text-sm text-[var(--warning)]">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--warning)]" />
                        <p className="font-medium">
                          Remote Control: Viewing workspace as admin for{' '}
                          <strong>{resolvedOutletName || outletId}</strong>.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.localStorage.removeItem('adminOverrideOutletId');
                            window.location.reload();
                          }
                        }}
                        className="rounded-ui-xs bg-[var(--warning)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        Exit Remote Control
                      </button>
                    </div>
                  );
                }
                return null;
              })()}
              <NetworkStatusBanner />
              {children}
            </div>
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="bookglow-mobile-nav lg:hidden" aria-label="Primary navigation">
          <div className="bookglow-mobile-nav__inner">
            {mobileBottomNavItems.map((item) => (
              <NavLink
                key={item.id}
                to={`/${item.id}`}
                onClick={() => setIsMoreMenuOpen(false)}
                className={({ isActive: routeActive }) =>
                  mobileBottomNavItemClass(
                    routeActive ||
                      (item.id === 'member' &&
                        location.pathname.startsWith('/member-details/')),
                  )
                }
              >
                <span className="bookglow-mobile-nav-item__icon">{item.icon}</span>
                <span className="bookglow-mobile-nav-item__label">
                  {item.shortLabel || item.label}
                </span>
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
                <span className="bookglow-mobile-nav-item__icon">
                  <MoreHorizontalIcon />
                </span>
                <span className="bookglow-mobile-nav-item__label">More</span>
              </button>
            )}
          </div>
        </nav>

        {/* Mobile more-sheet */}
        {isMoreMenuOpen && moreNavItems.length > 0 && (
          <>
            <button
              type="button"
              className="bookglow-more-backdrop lg:hidden"
              aria-label="Close navigation"
              onClick={() => setIsMoreMenuOpen(false)}
            />
            <div
              ref={moreMenuRef}
              className="bookglow-more-sheet lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="More pages"
            >
              <div className="bookglow-more-sheet__handle" aria-hidden />
              <div className="bookglow-more-sheet__header">
                <div>
                  <p className="bookglow-eyebrow">Bookglow workspace</p>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">More pages</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="bookglow-icon-button"
                  aria-label="Close navigation"
                >
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
                    className={({ isActive: routeActive }) =>
                      `bookglow-more-link ${routeActive ? 'bookglow-more-link--active' : ''}`
                    }
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
