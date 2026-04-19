
import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Transaction, Client, Service, Product, Package, TransactionType, Reward, Staff, Appointment, RoleCommission, OutletSettings } from './types';
import { INITIAL_SERVICES, INITIAL_PRODUCTS, INITIAL_PACKAGES, INITIAL_EXPENSE_CATEGORIES, INITIAL_REWARDS, INITIAL_STAFF, INITIAL_ROLE_COMMISSIONS } from './constants';
import Layout from './components/Layout';
import { useAuth } from './hooks/useAuth';
import { useFirestoreData } from './hooks/useFirestoreData';
import { useUserContext } from './contexts/UserContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { outletService } from './services/firestoreService';
import { syncSetmoreViaCallable } from './services/setmoreSyncService';

// Lazy-load pages to reduce build memory (each page becomes a separate chunk)
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const POS = React.lazy(() => import('./pages/POS'));
const CRM = React.lazy(() => import('./pages/CRM'));
const MemberDetails = React.lazy(() => import('./pages/MemberDetails'));
const Finance = React.lazy(() => import('./pages/Finance'));
const Transactions = React.lazy(() => import('./pages/Transactions'));
const Services = React.lazy(() => import('./pages/Services'));
const StaffPage = React.lazy(() => import('./pages/Staff'));
const Settings = React.lazy(() => import('./pages/Settings'));
const ExternalIntegrations = React.lazy(() => import('./pages/ExternalIntegrations'));
const AppointmentsCalendar = React.lazy(() => import('./pages/AppointmentsCalendar'));
const SalesReports = React.lazy(() => import('./pages/SalesReports'));
const SuperAdminLayout = React.lazy(() => import('./components/SuperAdminLayout'));
const SuperAdminDashboard = React.lazy(() => import('./pages/SuperAdminDashboard'));
const SuperAdminSubscribers = React.lazy(() => import('./pages/SuperAdminSubscribers'));

const App: React.FC = () => {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const { outletId, outletName, role, loading: userDataLoading } = useUserContext();
  
  // All hooks must be called before any conditional returns (React Rules of Hooks)
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeAppointmentForSale, setActiveAppointmentForSale] = useState<Appointment | null>(null);

  const ownerEmail = 'teekarseng94@gmail.com';
  const isSuperAdmin = (user?.email || '').toLowerCase() === ownerEmail.toLowerCase();
  const overrideOutletId =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('adminOverrideOutletId') || ''
      : '';

  // Multi-tenant: use ONLY the outletId from the user's Firestore document (users/{uid}).
  // Super admin can optionally override to inspect a specific outlet.
  const currentOutletID = outletId ?? '';
  const effectiveOutletID =
    isSuperAdmin && overrideOutletId
      ? overrideOutletId
      : currentOutletID;

  // Use Firestore for all data - replaces local state
  // Only load data if there is an effective outlet (for super admin this means when remote-viewing)
  const {
    clients,
    staff,
    appointments,
    transactions,
    services,
    products,
    packages,
    rewards,
    serviceCategories,
    loading: dataLoading,
    error: dataError,
    handleAddClient,
    handleUpdateClient,
    handleUpdateClientPoints,
    handleDeleteClient,
    handleUpdateClientCredit,
    handleRedeemVoucher,
    handleAddStaff,
    handleUpdateStaff,
    handleDeleteStaff,
    handleAddAppointment,
    handleUpdateAppointmentStatus,
    handleAddTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleVoidTransaction,
    handleAddService,
    handleUpdateService,
    handleDeleteService,
    handleAddProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    handleAddPackage,
    handleUpdatePackage,
    handleDeletePackage,
    handleUpdateRewards,
    handleAddServiceCategory,
    handleUpdateServiceCategory,
    handleDeleteServiceCategory,
    handleReorderServiceCategories
  } = useFirestoreData(effectiveOutletID, role);

  // Local state for UI-only data
  const [roleCommissions, setRoleCommissions] = useState<RoleCommission[]>(INITIAL_ROLE_COMMISSIONS);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(INITIAL_EXPENSE_CATEGORIES);
  
  // Settings & Permissions State (can be moved to Firestore later)
  const [outletSettings, setOutletSettings] = useState<OutletSettings>({
    shopName: 'ZenFlow Spa',
    isOutletModeEnabled: false,
    isAdminAuthenticated: true,
    lockedFeatures: [],
    paymentMethods: ['Cash', 'Credit Card', 'E-wallet', 'Other'],
    reminderEnabled: true,
    reminderTiming: 24,
    reminderChannel: 'Both'
  });

  // ProtectedRoute handles authentication and outletId checks
  return (
    <ProtectedRoute>
      {isSuperAdmin ? (
        <React.Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
              <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <SuperAdminLayout user={user} onLogout={logout}>
            <Routes>
              <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
              <Route path="/admin/subscribers" element={<SuperAdminSubscribers />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </SuperAdminLayout>
        </React.Suspense>
      ) : (
        <>
          {/* Show loading state while loading Firestore data */}
          {dataLoading && (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <div className="inline-block w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-600">Loading data from Firestore...</p>
                {outletName && <p className="text-sm text-slate-400 mt-2">Outlet: {outletName}</p>}
              </div>
            </div>
          )}

          {/* Render app content when data is loaded */}
          {!dataLoading && (
            <AppContent
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              role={role}
              activeAppointmentForSale={activeAppointmentForSale}
              setActiveAppointmentForSale={setActiveAppointmentForSale}
              currentOutletID={effectiveOutletID}
              outletName={outletName}
              clients={clients}
              staff={staff}
              appointments={appointments}
              transactions={transactions}
              services={services}
              products={products}
              packages={packages}
              rewards={rewards}
              serviceCategories={serviceCategories}
              user={user}
              logout={logout}
              handleAddClient={handleAddClient}
              handleUpdateClient={handleUpdateClient}
              handleUpdateClientPoints={handleUpdateClientPoints}
              handleDeleteClient={handleDeleteClient}
              handleUpdateClientCredit={handleUpdateClientCredit}
              handleRedeemVoucher={handleRedeemVoucher}
              handleAddStaff={handleAddStaff}
              handleUpdateStaff={handleUpdateStaff}
              handleDeleteStaff={handleDeleteStaff}
              handleAddAppointment={handleAddAppointment}
              handleUpdateAppointmentStatus={handleUpdateAppointmentStatus}
              handleAddTransaction={handleAddTransaction}
              handleUpdateTransaction={handleUpdateTransaction}
              handleDeleteTransaction={handleDeleteTransaction}
              handleVoidTransaction={handleVoidTransaction}
              handleAddService={handleAddService}
              handleUpdateService={handleUpdateService}
              handleDeleteService={handleDeleteService}
              handleAddProduct={handleAddProduct}
              handleUpdateProduct={handleUpdateProduct}
              handleDeleteProduct={handleDeleteProduct}
              handleAddPackage={handleAddPackage}
              handleUpdatePackage={handleUpdatePackage}
              handleDeletePackage={handleDeletePackage}
              handleUpdateRewards={handleUpdateRewards}
              handleAddServiceCategory={handleAddServiceCategory}
              handleUpdateServiceCategory={handleUpdateServiceCategory}
              handleDeleteServiceCategory={handleDeleteServiceCategory}
              handleReorderServiceCategories={handleReorderServiceCategories}
            />
          )}
        </>
      )}
    </ProtectedRoute>
  );
};

// Tab IDs that are admin-only; cashiers are redirected to POS if they try to access these
const ADMIN_ONLY_TABS = ['dashboard', 'transactions', 'finance', 'staff', 'settings'] as const;

// Valid top-level path segments (sidebar links use these as absolute paths, e.g. /dashboard, /pos)
const VALID_TAB_IDS = ['dashboard', 'pos', 'schedule', 'appointments', 'member', 'menu', 'sales-reports', 'transactions', 'finance', 'staff', 'settings'] as const;

// Separate component for app content to keep App.tsx clean
interface AppContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: 'admin' | 'cashier' | null;
  activeAppointmentForSale: Appointment | null;
  setActiveAppointmentForSale: (app: Appointment | null) => void;
  currentOutletID: string;
  outletName: string | null;
  clients: Client[];
  staff: Staff[];
  appointments: Appointment[];
  transactions: Transaction[];
  services: Service[];
  products: Product[];
  packages: Package[];
  rewards: Reward[];
  serviceCategories: string[];
  user: any;
  logout: () => Promise<void>;
  handleAddClient: (client: Omit<Client, 'id' | 'points'>) => Promise<string | undefined>;
  handleUpdateClient: (id: string, updatedData: Partial<Client>) => Promise<void>;
  handleUpdateClientPoints: (clientId: string, pointsChange: number) => Promise<void>;
  handleDeleteClient: (clientId: string) => Promise<void>;
  handleUpdateClientCredit: (clientId: string, amount: number, type: 'topup' | 'deduction', staffRemark: string, staffName: string, transactionId?: string) => Promise<number>;
  handleRedeemVoucher: (clientId: string) => Promise<void>;
  handleAddStaff: (member: Omit<Staff, 'id'>) => Promise<string | undefined>;
  handleUpdateStaff: (updatedMember: Staff) => Promise<void>;
  handleDeleteStaff: (id: string) => Promise<void>;
  handleAddAppointment: (newApp: Appointment) => Promise<string | undefined>;
  handleUpdateAppointmentStatus: (id: string, status?: Appointment['status'], updates?: Partial<Appointment>) => Promise<void>;
  handleAddTransaction: (txn: Transaction) => Promise<string | undefined>;
  handleUpdateTransaction: (id: string, updatedData: Partial<Transaction>) => Promise<void>;
  handleDeleteTransaction: (id: string) => Promise<void>;
  handleVoidTransaction: (id: string) => Promise<void>;
  handleAddService: (newService: Service) => Promise<string | undefined>;
  handleUpdateService: (updatedService: Service) => Promise<void>;
  handleDeleteService: (id: string) => Promise<void>;
  handleAddProduct: (newProduct: Product) => Promise<string | undefined>;
  handleUpdateProduct: (updated: Product) => Promise<void>;
  handleDeleteProduct: (id: string) => Promise<void>;
  handleAddPackage: (newPackage: Package) => Promise<string | undefined>;
  handleUpdatePackage: (updated: Package) => Promise<void>;
  handleDeletePackage: (id: string) => Promise<void>;
  handleUpdateRewards: (newRewards: Reward[]) => Promise<void>;
  handleAddServiceCategory: (category: string) => Promise<void> | void;
  handleUpdateServiceCategory: (oldName: string, newName: string) => Promise<void> | void;
  handleDeleteServiceCategory: (category: string) => Promise<void> | void;
  handleReorderServiceCategories: (orderedNames: string[]) => Promise<void> | void;
}

const DEFAULT_OUTLET_SETTINGS: OutletSettings = {
  shopName: 'ZenFlow Spa',
  isOutletModeEnabled: false,
  isAdminAuthenticated: true,
  lockedFeatures: [],
  paymentMethods: ['Cash', 'Credit Card', 'E-wallet', 'Other'],
  reminderEnabled: true,
  reminderTiming: 24,
  reminderChannel: 'Both',
  receiptHeaderTitle: 'Tax Invoice',
  receiptCompanyName: 'ZenFlow Spa',
  receiptPhone: '',
  receiptAddress: '',
  receiptFooterNote: 'Thank you for your visit!'
};

const AppContent: React.FC<AppContentProps> = ({
  activeTab,
  setActiveTab,
  role,
  activeAppointmentForSale,
  setActiveAppointmentForSale,
  currentOutletID,
  outletName,
  clients,
  staff,
  appointments,
  transactions,
  services,
  products,
  packages,
  rewards,
  serviceCategories,
  user,
  logout,
  handleAddClient,
  handleUpdateClient,
  handleUpdateClientPoints,
  handleDeleteClient,
  handleUpdateClientCredit,
  handleRedeemVoucher,
  handleAddStaff,
  handleUpdateStaff,
  handleDeleteStaff,
  handleAddAppointment,
  handleUpdateAppointmentStatus,
  handleAddTransaction,
  handleUpdateTransaction,
  handleDeleteTransaction,
  handleVoidTransaction,
  handleAddService,
  handleUpdateService,
  handleDeleteService,
  handleAddProduct,
  handleUpdateProduct,
  handleDeleteProduct,
  handleAddPackage,
  handleUpdatePackage,
  handleDeletePackage,
  handleUpdateRewards,
  handleAddServiceCategory,
  handleUpdateServiceCategory,
  handleDeleteServiceCategory,
  handleReorderServiceCategories
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Sync activeTab from URL when on a top-level page (not member-details). Ensures sidebar Link navigation works from any route.
  useEffect(() => {
    const pathname = location.pathname;
    if (pathname.startsWith('/member-details/')) return;
    const segment = pathname.replace(/^\//, '').split('/')[0] || 'dashboard';
    const normalizedSegment = segment === 'appointments' ? 'schedule' : segment;
    const tab = VALID_TAB_IDS.includes(normalizedSegment as any) ? normalizedSegment : 'dashboard';
    setActiveTab(tab);
  }, [location.pathname]);

  // Redirect cashiers away from admin-only tabs (including Dashboard) to POS
  useEffect(() => {
    if (role === 'cashier' && activeTab && ADMIN_ONLY_TABS.includes(activeTab as any)) {
      setActiveTab('pos');
      navigate('/pos', { replace: true });
    }
  }, [role, activeTab, setActiveTab, navigate]);

  // Local state for UI-only data
  const [roleCommissions, setRoleCommissions] = useState<RoleCommission[]>(INITIAL_ROLE_COMMISSIONS);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(INITIAL_EXPENSE_CATEGORIES);
  
  // Outlet settings: loaded from Firestore, persisted on update (payment methods, shop name, etc.)
  const [outletSettings, setOutletSettings] = useState<OutletSettings>({
    ...DEFAULT_OUTLET_SETTINGS,
    shopName: outletName || DEFAULT_OUTLET_SETTINGS.shopName,
    isAdminAuthenticated: role === 'admin'
  });

  // Load outlet settings from Firestore when outlet is available
  useEffect(() => {
    if (!currentOutletID?.trim()) return;
    outletService.getById(currentOutletID).then((outlet) => {
      if (outlet?.settings) {
        setOutletSettings((prev) => ({
          ...DEFAULT_OUTLET_SETTINGS,
          ...outlet.settings,
          shopName: outlet.settings!.shopName || outletName || prev.shopName,
          isAdminAuthenticated: role === 'admin'
        }));
        if (Array.isArray(outlet.settings!.roleCommissions) && outlet.settings!.roleCommissions!.length > 0) {
          setRoleCommissions(outlet.settings!.roleCommissions!);
        }
      }
    }).catch((err) => console.warn('Failed to load outlet settings:', err));
  }, [currentOutletID]);

  // Keep isAdminAuthenticated in sync with RBAC role (for feature locking, etc.)
  useEffect(() => {
    if (role != null) {
      setOutletSettings((prev) => ({ ...prev, isAdminAuthenticated: role === 'admin' }));
    }
  }, [role]);

  // Persist outlet settings to Firestore (payment methods, shop name, reminders, etc.)
  const handleUpdateOutletSettings = async (newSettings: OutletSettings) => {
    setOutletSettings(newSettings);
    if (!currentOutletID?.trim()) return;
    try {
      await outletService.update(currentOutletID, {
        settings: newSettings,
        // Keep outlet.name in sync so public booking page shows updated name
        name: newSettings.shopName
      });
    } catch (err) {
      console.error('Failed to save outlet settings:', err);
    }
  };

  // Sync Setmore appointments via Cloud Function (called once when Appointment page opens)
  const handleSyncSetmoreOnOpen = async () => {
    if (!currentOutletID?.trim()) return;
    try {
      const result = await syncSetmoreViaCallable({
        feedUrl: outletSettings.setmoreFeedUrl,
        outletID: currentOutletID,
        clients,
        defaultStaffId: staff[0]?.id ?? '',
        defaultServiceId: services[0]?.id ?? ''
      });
      if (result.success || result.synced > 0) {
        await handleUpdateOutletSettings({
          ...outletSettings,
          setmoreLastSyncedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Setmore sync on open:', err);
    }
  };

  const isFeatureLocked = (featureId: string) => {
    return outletSettings.isOutletModeEnabled && 
           outletSettings.lockedFeatures.includes(featureId) && 
           !outletSettings.isAdminAuthenticated;
  };

  // Client handlers are now from useFirestoreData hook

  // Staff handlers are now from useFirestoreData hook
  // Wrapper functions to add feature locking
  const handleAddStaffWithLock = async (member: Omit<Staff, 'id'>) => {
    if (isFeatureLocked('manage-staff')) return;
    await handleAddStaff(member);
  };

  const handleUpdateStaffWithLock = async (updatedMember: Staff) => {
    if (isFeatureLocked('manage-staff')) return;
    await handleUpdateStaff(updatedMember);
  };

  const handleDeleteStaffWithLock = async (id: string) => {
    if (isFeatureLocked('manage-staff')) return;
    await handleDeleteStaff(id);
  };

  const handleUpdateRoleCommissions = (updated: RoleCommission[]) => {
    if (isFeatureLocked('manage-staff')) return;
    setRoleCommissions(updated);
    // Persist to outlet settings in Firestore so changes survive refresh
    handleUpdateOutletSettings({
      ...outletSettings,
      roleCommissions: updated
    });
  };

  // Client points handler is now from useFirestoreData hook

  // Enhanced transaction handler with commission and appointment logic
  const handleAddTransactionWithLogic = async (txn: Transaction) => {
    // Must have a valid outlet for data to be saved to Firestore (multi-tenant)
    if (!currentOutletID || !String(currentOutletID).trim()) {
      alert('Cannot save sale: no outlet assigned to your account. Please contact your administrator to set your outlet in the users collection.');
      return;
    }
    // Ensure transaction has outletID so it is stored under the correct outlet
    const transactionWithOutlet: Transaction = {
      ...txn,
      outletID: (txn.outletID?.trim() || currentOutletID).trim()
    };

    // Add main transaction to Firestore (commissions and loyalty points are applied once inside the hook — do not duplicate here)
    await handleAddTransaction(transactionWithOutlet);

    // If payment was Member Credit, deduct from client wallet and log to credit_history
    const staffNameForCredit = user?.displayName || user?.email || 'Staff';
    if (
      transactionWithOutlet.type === TransactionType.SALE &&
      transactionWithOutlet.paymentMethod?.startsWith('Member Credit') &&
      transactionWithOutlet.clientId &&
      transactionWithOutlet.amount > 0
    ) {
      await handleUpdateClientCredit(
        transactionWithOutlet.clientId,
        transactionWithOutlet.amount,
        'deduction',
        `POS Sale #${transactionWithOutlet.id}`,
        staffNameForCredit,
        transactionWithOutlet.id
      );
    }

    // Handle appointments (points are handled inside useFirestoreData handleAddTransaction with saleId idempotency)
    if (transactionWithOutlet.type === TransactionType.SALE) {
      // Create "On Duty" calendar entries for assigned therapists
      if (transactionWithOutlet.items && transactionWithOutlet.items.length > 0) {
        const txnDateObj = new Date(transactionWithOutlet.date);
        const dateStr = txnDateObj.toISOString().split('T')[0];
        const timeStr = txnDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        for (const [idx, item] of transactionWithOutlet.items.entries()) {
          if (item.type === 'service' && item.staffId) {
            // Find the service to get duration
            const service = services.find(s => s.id === item.id);
            const duration = service?.duration || 60; // Default to 60 minutes if not found
            
            // Calculate end time
            const startTime = new Date(txnDateObj);
            const [hours, minutes] = timeStr.split(':').map(Number);
            startTime.setHours(hours, minutes, 0, 0);
            const endTime = new Date(startTime.getTime() + duration * 60000); // Add duration in milliseconds
            const endTimeStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

            // Create "On Duty" appointment entry
            const newApp: Appointment = {
              id: `app_onduty_${transactionWithOutlet.id}_${idx}_${Date.now()}`,
              outletID: transactionWithOutlet.outletID,
              clientId: transactionWithOutlet.clientId || 'guest',
              staffId: item.staffId,
              serviceId: item.id,
              date: dateStr,
              time: timeStr,
              endTime: endTimeStr,
              status: 'scheduled', // Mark as scheduled for "On Duty" entries
              isOnDuty: true // Flag to identify On Duty entries created from POS
            };
            const appointmentId = await handleAddAppointment(newApp);
            
            // Emit Socket.io event for real-time updates (optional - Firestore listeners already provide real-time updates)
            try {
              const { emitAppointmentUpdate } = await import('./services/socketService');
              emitAppointmentUpdate({ ...newApp, id: appointmentId || newApp.id });
            } catch (error) {
              // Socket.io not configured or not available - Firestore listeners will handle updates
              console.log('Socket.io not available, using Firestore real-time listeners');
            }
          }
        }
      }
    }
  };

  // Appointment handlers are now from useFirestoreData hook
  // Enhanced wrapper to handle POS flow
  const handleUpdateAppointmentStatusWithPOS = async (id: string, status: Appointment['status']) => {
    await handleUpdateAppointmentStatus(id, status);
    
    // If completed, open POS for this appointment
    // Note: We need to wait for data to reload, so we'll find it from the updated appointments
    if (status === 'completed') {
      // Small delay to allow Firestore to update
      setTimeout(() => {
        const completedApp = appointments.find(a => a.id === id);
        if (completedApp) {
          setActiveAppointmentForSale(completedApp);
          navigate('/pos');
          setActiveTab('pos');
        }
      }, 100);
    }
  };

  const handleMarkReminderSent = async (id: string) => {
    // Update appointment reminder status in Firestore
    await handleUpdateAppointmentStatus(id, undefined, { reminderSent: true });
  };

  const handleStartPOSSale = (app: Appointment) => {
    setActiveAppointmentForSale(app);
    navigate('/pos');
    setActiveTab('pos');
  };

  // Transaction handlers are now from useFirestoreData hook
  // Wrapper functions to add feature locking
  const handleUpdateTransactionWithLock = async (id: string, updatedData: Partial<Transaction>) => {
    if (isFeatureLocked('delete-transaction')) return;
    await handleUpdateTransaction(id, updatedData);
  };

  const handleDeleteTransactionWithLock = async (id: string) => {
    if (isFeatureLocked('delete-transaction')) return;
    await handleDeleteTransaction(id);
  };

  // Service handlers are now from useFirestoreData hook
  // Wrapper functions to add feature locking
  const handleUpdateServiceWithLock = async (updatedService: Service) => {
    if (isFeatureLocked('edit-service')) return;
    await handleUpdateService(updatedService);
  };

  const handleAddServiceWithLock = async (newService: Service) => {
    if (isFeatureLocked('edit-service')) return;
    const serviceWithOutlet: Service = {
      ...newService,
      outletID: newService.outletID || currentOutletID
    };
    await handleAddService(serviceWithOutlet);
  };

  const handleDeleteServiceWithLock = async (id: string) => {
    if (isFeatureLocked('edit-service')) return;
    await handleDeleteService(id);
  };

  // Product handlers are now from useFirestoreData hook
  // Wrapper functions to add feature locking
  const handleUpdateProductWithLock = async (updated: Product) => {
    if (isFeatureLocked('edit-service')) return;
    await handleUpdateProduct(updated);
  };

  const handleAddProductWithLock = async (newProduct: Product) => {
    if (isFeatureLocked('edit-service')) return;
    const productWithOutlet: Product = {
      ...newProduct,
      outletID: newProduct.outletID || currentOutletID
    };
    await handleAddProduct(productWithOutlet);
  };

  const handleDeleteProductWithLock = async (id: string) => {
    if (isFeatureLocked('edit-service')) return;
    await handleDeleteProduct(id);
  };

  // Package handlers are now from useFirestoreData hook
  // Wrapper functions to add feature locking
  const handleUpdatePackageWithLock = async (updated: Package) => {
    if (isFeatureLocked('edit-service')) return;
    await handleUpdatePackage(updated);
  };

  const handleAddPackageWithLock = async (newPackage: Package) => {
    if (isFeatureLocked('edit-service')) return;
    const packageWithOutlet: Package = {
      ...newPackage,
      outletID: newPackage.outletID || currentOutletID
    };
    await handleAddPackage(packageWithOutlet);
  };

  const handleDeletePackageWithLock = async (id: string) => {
    if (isFeatureLocked('edit-service')) return;
    await handleDeletePackage(id);
  };

  const handleAddExpenseCategory = (category: string) => {
    if (isFeatureLocked('finance-view')) return;
    if (category && !expenseCategories.includes(category)) {
      setExpenseCategories(prev => [...prev, category]);
    }
  };

  const handleDeleteExpenseCategory = (category: string) => {
    if (isFeatureLocked('finance-view')) return;
    setExpenseCategories(prev => prev.filter(c => c !== category));
  };

  // Rewards handler is now from useFirestoreData hook

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard transactions={transactions} clients={clients} appointments={appointments} services={services} outletSettings={outletSettings} outletID={currentOutletID} onMarkReminderSent={handleMarkReminderSent} />;
      case 'pos':
        return <POS services={services} products={products} packages={packages} clients={clients} staff={staff} roleCommissions={roleCommissions} onCompleteSale={handleAddTransactionWithLogic} activeAppointmentForSale={activeAppointmentForSale} onClearActiveAppointment={() => setActiveAppointmentForSale(null)} paymentMethods={outletSettings.paymentMethods} outletSettings={outletSettings} />;
      case 'member':
        return <CRM clients={clients} onAddClient={handleAddClient} onUpdateClient={handleUpdateClient} transactions={transactions} onUpdatePoints={handleUpdateClientPoints} onAddTransaction={handleAddTransactionWithLogic} services={services} rewards={rewards} onUpdateRewards={handleUpdateRewards} isExportLocked={isFeatureLocked('export-crm')} />;
      case 'staff':
        return <StaffPage staff={staff} services={services} roleCommissions={roleCommissions} onUpdateRoleCommissions={handleUpdateRoleCommissions} onAddStaff={handleAddStaffWithLock} onUpdateStaff={handleUpdateStaffWithLock} onDeleteStaff={handleDeleteStaffWithLock} transactions={transactions} isLocked={isFeatureLocked('manage-staff')} />;
      case 'menu':
        return <Services services={services} products={products} packages={packages} onUpdateService={handleUpdateServiceWithLock} onAddService={handleAddServiceWithLock} onDeleteService={handleDeleteServiceWithLock} onUpdateProduct={handleUpdateProductWithLock} onAddProduct={handleAddProductWithLock} onDeleteProduct={handleDeleteProductWithLock} onUpdatePackage={handleUpdatePackageWithLock} onAddPackage={handleAddPackageWithLock} onDeletePackage={handleDeletePackageWithLock} categories={serviceCategories} onAddCategory={handleAddServiceCategory} onEditCategory={handleUpdateServiceCategory} onDeleteCategory={handleDeleteServiceCategory} onReorderCategories={handleReorderServiceCategories} isLocked={isFeatureLocked('edit-service')} />;
      case 'transactions':
        return <Transactions transactions={transactions} clients={clients} onUpdateTransaction={handleUpdateTransactionWithLock} onDeleteTransaction={handleDeleteTransactionWithLock} isDeleteLocked={isFeatureLocked('delete-transaction')} />;
      case 'sales-reports':
        return <SalesReports 
          transactions={transactions} 
          staff={staff} 
          clients={clients}
          serviceCategories={serviceCategories}
          outletID={currentOutletID}
          onVoidTransaction={handleVoidTransaction}
          onUpdateTransaction={handleUpdateTransaction}
        />;
      case 'schedule':
      case 'appointments':
        return <AppointmentsCalendar appointments={appointments} staff={staff} clients={clients} services={services} roleCommissions={roleCommissions} onAddAppointment={handleAddAppointment} onUpdateAppointmentStatus={handleUpdateAppointmentStatusWithPOS} onStartPOSSale={handleStartPOSSale} onMarkReminderSent={handleMarkReminderSent} outletSettings={outletSettings} onSyncSetmore={handleSyncSetmoreOnOpen} />;
      case 'finance':
        return <Finance transactions={transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} expenseCategories={expenseCategories} onAddCategory={handleAddExpenseCategory} onDeleteCategory={handleDeleteExpenseCategory} isLocked={isFeatureLocked('finance-view')} />;
      case 'settings':
        return <Settings settings={outletSettings} onUpdateSettings={handleUpdateOutletSettings} outletId={currentOutletID} />;
      default:
        return <Dashboard transactions={transactions} clients={clients} appointments={appointments} services={services} outletSettings={outletSettings} outletID={currentOutletID} onMarkReminderSent={handleMarkReminderSent} />;
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      isAdmin={role === 'admin'} 
      shopName={outletSettings.shopName}
      user={user}
      onLogout={handleLogout}
      outletId={currentOutletID}
      outletName={outletName}
      role={role}
    >
      <div className="animate-fadeIn">
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/appointments" element={<Navigate to="/schedule" replace />} />
            <Route
              path="/member-details/:id"
              element={
                <MemberDetails
                  clients={clients}
                  transactions={transactions}
                  appointments={appointments}
                  staff={staff}
                  services={services}
                  staffName={user?.displayName || user?.email || 'Staff'}
                  onDeleteClient={handleDeleteClient}
                  onUpdateClientCredit={handleUpdateClientCredit}
                  onRedeemVoucher={handleRedeemVoucher}
                  onVoidTransaction={handleVoidTransaction}
                />
              }
            />
            <Route path="/settings/integrations" element={<ExternalIntegrations settings={outletSettings} onUpdateSettings={handleUpdateOutletSettings} currentOutletID={currentOutletID} clients={clients} staff={staff} services={services} />} />
            <Route path="*" element={renderContent()} />
          </Routes>
        </React.Suspense>
      </div>
    </Layout>
  );
};

export default App;
