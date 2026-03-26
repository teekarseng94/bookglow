
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { Icons } from '../constants';
import { User } from 'firebase/auth';
import type { UserRole } from '../contexts/UserContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin?: boolean;
  shopName: string;
  user?: User | null;
  onLogout?: () => void;
  /** Current outlet id (multi-tenant) — so you can confirm which outlet data is shown/saved */
  outletId?: string | null;
  /** Current outlet display name */
  outletName?: string | null;
  /** User role from Firestore: admin (all links) or cashier (POS, Member, Menu, Sales Report only; no Dashboard) */
  role?: UserRole | null;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, isAdmin, shopName, user, onLogout, outletId, outletName, role }) => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileProfileMenu, setShowMobileProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside (desktop)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (mobileProfileMenuRef.current && !mobileProfileMenuRef.current.contains(event.target as Node)) {
        setShowMobileProfileMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        // Check if click is on overlay (backdrop)
        const target = event.target as HTMLElement;
        if (target.classList.contains('mobile-menu-overlay')) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    if (showProfileMenu || showMobileProfileMenu || isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu, showMobileProfileMenu, isMobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    setShowProfileMenu(false);
    onLogout?.();
  };

  const getUserInitials = () => {
    if (user?.displayName) {
      return user.displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return role === 'admin' ? 'AD' : 'CA';
  };

  const getUserDisplayName = () => {
    return user?.displayName || user?.email || (role === 'admin' ? 'Administrator' : 'Cashier');
  };

  // Role-based title for header (from Firestore). When role not yet loaded, show Cashier so we never show admin by mistake.
  const getRoleDisplayTitle = () => {
    if (role === 'admin') return 'Spa Administrator';
    return 'Cashier'; // cashier or role not yet loaded
  };
  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Icons.Dashboard /> },
    { id: 'pos', label: 'Point of Sale', icon: <Icons.POS /> },
    { id: 'appointments', label: 'Appointment', icon: <Icons.Calendar /> },
    { id: 'member', label: 'Member', icon: <Icons.Clients /> },
    { id: 'menu', label: 'Menu', icon: <Icons.Services /> },
    { id: 'sales-reports', label: 'Sales Reports', icon: <Icons.Reports /> },
    { id: 'transactions', label: 'Sales History', icon: <Icons.Finance /> },
    { id: 'finance', label: 'Expenses', icon: <Icons.Finance /> },
    { id: 'staff', label: 'Staff & Team', icon: <Icons.Staff /> },
    { id: 'settings', label: 'Settings', icon: <Icons.Settings /> },
    { id: 'report', label: 'Report', icon: <Icons.Flag /> },
  ];

  // Cashier: POS, Member, Menu, Sales Report only (no Dashboard, no Report — admin only)
  const cashierTabIds = ['pos', 'member', 'menu', 'sales-reports'];
  const navItems = role === 'admin'
    ? allNavItems
    : allNavItems.filter((item) => cashierTabIds.includes(item.id));

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-menu-overlay fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-out Menu */}
      <aside
        ref={mobileMenuRef}
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h1 className="text-xl font-bold text-teal-600 flex items-center gap-2 overflow-hidden">
            <span className="w-8 h-8 bg-teal-600 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-lg">
              {shopName.charAt(0)}
            </span>
            <span className="truncate">{shopName}</span>
          </h1>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={`/${item.id}`}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all min-h-[48px] ${
                  isActive ? 'bg-teal-50 text-teal-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-100 text-[10px] text-slate-400">
          © 2024 {shopName} v1.7 • {role === 'admin' ? 'Admin View' : 'Cashier View'}
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden lg:flex">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-teal-600 flex items-center gap-2 overflow-hidden">
            <span className="w-8 h-8 bg-teal-600 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-lg">
              {shopName.charAt(0)}
            </span>
            <span className="truncate">{shopName}</span>
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={`/${item.id}`}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all min-h-[48px] ${
                  isActive ? 'bg-teal-50 text-teal-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-100 text-[10px] text-slate-400">
          © 2024 {shopName} v1.7 • {role === 'admin' ? 'Admin View' : 'Cashier View'}
        </div>
      </aside>

      {/* Mobile Top Nav */}
      <div className="lg:hidden fixed top-0 w-full bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4 py-3 h-16">
         {/* Hamburger Menu Button */}
         <button
           onClick={() => setIsMobileMenuOpen(true)}
           className="p-3 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
           aria-label="Open menu"
         >
           <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
           </svg>
         </button>

         {/* Logo - Centered */}
         <div className="flex-1 flex items-center justify-center px-4">
           <h1 className="text-lg font-bold text-teal-600 truncate">{shopName}</h1>
         </div>
           
         {/* Mobile Profile Dropdown */}
         <div className="relative" ref={mobileProfileMenuRef}>
           <button
             onClick={() => setShowMobileProfileMenu(!showMobileProfileMenu)}
             className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
             aria-label="User menu"
           >
             <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm ${
               isAdmin 
                 ? 'bg-teal-100 border-teal-200 text-teal-700' 
                 : 'bg-slate-100 border-slate-200 text-slate-600'
             }`}>
               {getUserInitials()}
             </div>
           </button>

           {/* Mobile Dropdown Menu */}
           {showMobileProfileMenu && (
             <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50 animate-fadeIn">
               <div className="px-4 py-3 border-b border-slate-100">
                 <p className="text-sm font-semibold text-slate-900">{getUserDisplayName()}</p>
                 {user?.email && (
                   <p className="text-xs text-slate-500 mt-1 truncate">{user.email}</p>
                 )}
               </div>
               <div className="py-1">
                 {role === 'admin' && (
                   <button
                     onClick={() => {
                       navigate('/settings');
                       setShowMobileProfileMenu(false);
                     }}
                     className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 flex items-center gap-3 min-h-[48px] transition-colors"
                   >
                     <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                     </svg>
                     Settings
                   </button>
                 )}
                 {onLogout && (
                   <button
                     onClick={() => {
                       setShowMobileProfileMenu(false);
                       handleLogout();
                     }}
                     className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 flex items-center gap-3 min-h-[48px] transition-colors"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                     </svg>
                     Sign Out
                   </button>
                 )}
               </div>
             </div>
           )}
         </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto pt-16 lg:pt-0">
        <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10 hidden lg:block">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold capitalize">
                {activeTab === 'member' ? 'Member' : activeTab === 'appointments' ? 'Appointment' : activeTab.replace('-', ' ')}
              </h2>
              {outletId && (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200" title="Data is loaded and saved for this outlet">
                  Outlet: {outletName || outletId}
                  {outletName && outletName !== outletId && (
                    <span className="text-slate-400 ml-1">({outletId})</span>
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
               {/* Profile Dropdown - Entire Section Clickable */}
               <div className="relative" ref={profileMenuRef} style={{ zIndex: 1000 }}>
                 <button
                   type="button"
                   onClick={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     console.log('Profile button clicked'); // Debug log
                     setShowProfileMenu(!showProfileMenu);
                   }}
                   onMouseDown={(e) => e.stopPropagation()}
                   className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-all group cursor-pointer"
                   aria-label="User menu"
                   aria-expanded={showProfileMenu}
                   title="Click to view profile menu and sign out"
                   style={{ 
                     position: 'relative',
                     zIndex: 1000,
                     pointerEvents: 'auto'
                   }}
                 >
                   {/* User Info Text - role from Firestore (admin/cashier) */}
                   <div className="flex flex-col items-end text-right">
                     <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                       {getRoleDisplayTitle()}
                     </span>
                     <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest group-hover:text-slate-500">
                       {role === 'admin' ? 'Full Permissions' : 'Restricted Access'}
                     </span>
                     {user?.email && (
                       <span className="text-xs text-slate-500 mt-0.5 hidden lg:block">{user.email}</span>
                     )}
                   </div>
                   
                   {/* Avatar */}
                   <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all group-hover:border-teal-400 group-hover:shadow-md ${
                     isAdmin 
                       ? 'bg-teal-100 border-teal-200 text-teal-700' 
                       : 'bg-slate-100 border-slate-200 text-slate-600'
                   }`}>
                     {getUserInitials()}
                   </div>
                   
                   {/* Dropdown Arrow */}
                   <svg 
                     className={`w-4 h-4 text-slate-400 transition-transform group-hover:text-slate-600 ${showProfileMenu ? 'rotate-180' : ''}`}
                     fill="none" 
                     stroke="currentColor" 
                     viewBox="0 0 24 24"
                   >
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                   </svg>
                 </button>

                 {/* Dropdown Menu */}
                 {showProfileMenu && (
                   <div 
                     className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 animate-fadeIn"
                     onClick={(e) => e.stopPropagation()}
                     style={{ 
                       zIndex: 9999,
                       position: 'absolute',
                       top: '100%',
                       right: 0
                     }}
                   >
                     {/* User Info */}
                     <div className="px-4 py-3 border-b border-slate-100">
                       <p className="text-sm font-semibold text-slate-900">{getRoleDisplayTitle()}</p>
                       {user?.email && (
                         <p className="text-xs text-slate-500 mt-1 truncate">{user.email}</p>
                       )}
                       <div className="mt-2">
                         <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                           role === 'admin' 
                             ? 'bg-teal-100 text-teal-700' 
                             : 'bg-slate-100 text-slate-600'
                         }`}>
                           {role === 'admin' ? 'Administrator' : 'Cashier'}
                         </span>
                       </div>
                     </div>

                     {/* Menu Items */}
                     <div className="py-1">
                       {role === 'admin' && (
                         <button
                           onClick={() => {
                             navigate('/settings');
                             setShowProfileMenu(false);
                           }}
                           className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 flex items-center gap-3 transition-colors min-h-[48px]"
                         >
                           <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                           </svg>
                           Settings
                         </button>
                       )}
                       {onLogout && (
                         <button
                           onClick={handleLogout}
                           className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 flex items-center gap-3 transition-colors min-h-[48px]"
                         >
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                           </svg>
                           Sign Out
                         </button>
                       )}
                     </div>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </header>
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
