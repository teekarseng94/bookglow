/**
 * React Hook for Supabase Data Management
 *
 * Provides real-time data synchronization with Supabase and CRUD operations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserSupabaseClient } from '@bookglow/supabase';
import {
  clientService,
  staffService,
  appointmentService,
  transactionService,
  serviceService,
  productService,
  packageService,
  rewardService,
  outletService,
  setCurrentOutletID,
} from '../services/databaseService';
import { setCurrentOutletID as setPointTransactionOutletID } from '../services/pointTransactionService';
import { pointTransactionService } from '../services/pointTransactionService';
import { setCurrentOutletID as setOutstandingTransactionOutletID } from '../services/outstandingTransactionService';
import {
  Client,
  Staff,
  Appointment,
  Transaction,
  Service,
  Product,
  Package,
  Reward,
  TransactionType
} from '../types';
import { domainsForRoute, tableToDomain, type OutletDataDomain } from './outletDataDomains';

export type { OutletDataDomain } from './outletDataDomains';
export { domainsForRoute } from './outletDataDomains';

const NO_OUTLET_ERROR = 'No outlet assigned. Each user must be mapped to an outlet in the users collection.';

const DEFAULT_SERVICE_CATEGORIES = ['Massage', 'Facial', 'Nails', 'Aromatherapy', 'Packages'];

/** Sale document IDs we've already created commissions for this session (prevents duplicate if handler runs twice) */
const commissionCreatedForSaleIds = new Set<string>();

/** Role from users/{uid}: cashiers may only read/write SALE transactions (Firestore rules). */
export type FirestoreUserRole = 'admin' | 'manager' | 'cashier' | null;

export const useFirestoreData = (
  outletID: string,
  role: FirestoreUserRole = null,
  activeRoute: string = 'dashboard',
) => {
  // Multi-tenant: outletID must come from the authenticated user's Firestore document (users/{uid}.outletId). No default.
  const hasOutlet = Boolean(outletID && String(outletID).trim());
  // Until role is known, use cashier-safe query (only SALE) so we don't get permission denied
  const isCashier = role === 'cashier';

  // Set current outlet ID only when valid
  useEffect(() => {
    if (hasOutlet) {
      setCurrentOutletID(outletID);
      setPointTransactionOutletID(outletID); // Sync outletID for point transactions
      setOutstandingTransactionOutletID(outletID); // Sync outletID for outstanding transactions
    }
  }, [outletID, hasOutlet]);

  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Domains successfully loaded for this outlet (kept across navigations). */
  const loadedDomainsRef = useRef<Set<OutletDataDomain>>(new Set());
  const pendingTablesRef = useRef<Set<string>>(new Set());

  /** Ref to delete transaction (set after handleDeleteTransaction is defined) so handleDeleteAppointment can delete the linked sale from Sales History. */
  const deleteTransactionRef = useRef<((id: string) => Promise<void>) | null>(null);

  // When user has no outlet, do not load any data (strict multi-tenant isolation)
  useEffect(() => {
    if (!hasOutlet) {
      setLoading(false);
      setError(NO_OUTLET_ERROR);
      setClients([]);
      setStaff([]);
      setAppointments([]);
      setTransactions([]);
      setServices([]);
      setProducts([]);
      setPackages([]);
      setRewards([]);
      setServiceCategories([]);
      loadedDomainsRef.current = new Set();
    } else {
      setError(null);
    }
  }, [hasOutlet]);

  // Outlet switch: drop cached domains so the next route load is scoped to the new tenant.
  useEffect(() => {
    loadedDomainsRef.current = new Set();
    pendingTablesRef.current = new Set();
    setClients([]);
    setStaff([]);
    setAppointments([]);
    setTransactions([]);
    setServices([]);
    setProducts([]);
    setPackages([]);
    setRewards([]);
  }, [outletID]);

  const refreshDomain = useCallback(
    async (domain: OutletDataDomain, trigger: 'initial_load' | 'route_change' | 'realtime_event' | 'manual_refresh' = 'manual_refresh') => {
      if (!hasOutlet) return;
      const { setTelemetryTrigger } = await import('../services/queryTelemetry');
      setTelemetryTrigger(trigger);

      if (domain === 'catalog') {
        const [staffData, servicesData, productsData, packagesData, rewardsData, categoriesData] =
          await Promise.all([
            staffService.getAll(outletID),
            serviceService.getAll(outletID),
            productService.getAll(outletID),
            packageService.getAll(outletID),
            rewardService.getAll(outletID),
            outletService.getServiceCategories(outletID),
          ]);
        setStaff(staffData);
        setServices(servicesData);
        setProducts(productsData);
        setPackages(packagesData);
        setRewards(rewardsData);
        if (Array.isArray(categoriesData) && categoriesData.length > 0) {
          setServiceCategories(categoriesData);
        } else {
          setServiceCategories(DEFAULT_SERVICE_CATEGORIES);
        }
      } else if (domain === 'clients') {
        // First page only for list shells; CRM search uses clientService.search.
        const clientsData = await clientService.listPage(outletID, { limit: 50, offset: 0 });
        setClients(clientsData);
      } else if (domain === 'appointments') {
        // Default: rolling 60-day window (past 7 + next 53) instead of all history.
        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - 7);
        const end = new Date(today);
        end.setDate(end.getDate() + 53);
        const startDate = start.toISOString().slice(0, 10);
        const endDate = end.toISOString().slice(0, 10);
        const appointmentsData = await appointmentService.getInDateRange(startDate, endDate, outletID);
        setAppointments(appointmentsData.filter((a) => !a.id.startsWith('app_onduty_')));
      } else if (domain === 'transactions') {
        // Default: last 62 days of ledger rows (list projection, no items JSON).
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 62);
        const transactionsData = await transactionService.getInDateRange(
          start.toISOString(),
          end.toISOString(),
          outletID,
          { limit: 500, offset: 0 },
        );
        setTransactions(transactionsData);
      }
      loadedDomainsRef.current.add(domain);
    },
    [hasOutlet, outletID],
  );

  const loadData = useCallback(async () => {
    if (!hasOutlet || !outletID) return;
    setLoading(true);
    setError(null);
    try {
      const domains = new Set<OutletDataDomain>(['catalog', ...domainsForRoute(activeRoute)]);
      for (const domain of domains) await refreshDomain(domain, 'manual_refresh');
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [activeRoute, hasOutlet, outletID, refreshDomain]);

  // Route-scoped load: catalog always; heavy domains only when the active route needs them.
  useEffect(() => {
    if (!hasOutlet || !outletID) return;
    let cancelled = false;

    const run = async () => {
      const needed = domainsForRoute(activeRoute);
      const missing = [...needed].filter((d) => !loadedDomainsRef.current.has(d));
      // Always ensure catalog on first paint
      if (!loadedDomainsRef.current.has('catalog') && !missing.includes('catalog')) {
        missing.unshift('catalog');
      }
      if (missing.length === 0) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const trigger = loadedDomainsRef.current.size === 0 ? 'initial_load' : 'route_change';
        for (const domain of missing) {
          if (cancelled) return;
          await refreshDomain(domain, trigger);
        }
      } catch (err: any) {
        console.error('Error loading outlet data:', err);
        if (!cancelled) setError(err?.message || 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [hasOutlet, outletID, activeRoute, refreshDomain]);

  // Realtime: refresh only the affected loaded domain (never full-table dump of all domains).
  useEffect(() => {
    if (!hasOutlet || !outletID) return;

    let cancelled = false;
    let debounceTimer: number | undefined;
    const supabase = createBrowserSupabaseClient(
      import.meta.env as unknown as Record<string, string | undefined>,
    );

    const flushPending = () => {
      const tables = [...pendingTablesRef.current];
      pendingTablesRef.current.clear();
      const domains = new Set<OutletDataDomain>();
      for (const table of tables) {
        const domain = tableToDomain(table);
        if (!domain) continue;
        if (loadedDomainsRef.current.has(domain)) domains.add(domain);
      }
      void (async () => {
        try {
          for (const domain of domains) {
            if (cancelled) return;
            await refreshDomain(domain, 'realtime_event');
          }
        } catch (err: any) {
          console.error('Supabase targeted refresh error:', err);
        }
      })();
    };

    const scheduleTableRefresh = (table: string) => {
      pendingTablesRef.current.add(table);
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(flushPending, 300);
    };

    const tables = [
      'clients',
      'staff',
      'services',
      'appointments',
      'transactions',
      'products',
      'packages',
      'rewards',
      'vouchers',
      'outlets',
    ] as const;

    let channel = supabase.channel(`merchant-outlet-${outletID}`);
    for (const table of tables) {
      const filter = `outlet_id=eq.${outletID}`;
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        () => scheduleTableRefresh(table),
      );
    }
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' && import.meta.env.DEV) {
        console.debug('Supabase Realtime subscribed for outlet:', outletID);
      }
    });

    return () => {
      cancelled = true;
      if (debounceTimer) window.clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  }, [outletID, hasOutlet, isCashier, refreshDomain]);

  // Client operations
  const handleAddClient = useCallback(async (client: Omit<Client, 'id' | 'points' | 'outletID'> & { points?: number; outletID?: string }) => {
    try {
      console.log('Adding client to Firestore:', client);
      const id = await clientService.add(client, outletID);
      console.log('Client added successfully with ID:', id);
      // Real-time listener will update automatically
      return id;
    } catch (err: any) {
      console.error('Error adding client:', err);
      setError(err.message || 'Failed to add client');
      throw err;
    }
  }, [outletID]);

  const handleUpdateClient = useCallback(async (id: string, updatedData: Partial<Client>) => {
    try {
      console.log('Updating client in Firestore:', id, updatedData);
      await clientService.update(id, updatedData, outletID);
      // Real-time listener will update automatically
    } catch (err: any) {
      console.error('Error updating client:', err);
      setError(err.message || 'Failed to update client');
      throw err;
    }
  }, [outletID]);

  const handleUpdateClientPoints = useCallback(async (clientId: string, pointsChange: number) => {
    try {
      console.log('Updating client points:', clientId, pointsChange);
      await clientService.updatePoints(clientId, pointsChange, outletID);
      // Real-time listener will update automatically
    } catch (err: any) {
      console.error('Error updating client points:', err);
      setError(err.message || 'Failed to update client points');
      throw err;
    }
  }, [outletID]);

  const handleDeleteClient = useCallback(async (clientId: string) => {
    try {
      console.log('Deleting client from Firestore:', clientId);
      await clientService.delete(clientId, outletID);
      // Real-time listener will update automatically
    } catch (err: any) {
      console.error('Error deleting client:', err);
      setError(err.message || 'Failed to delete client');
      throw err;
    }
  }, [outletID]);

  /** Undo a CSV import: delete all clients with the given lastImportId (session id). Returns count deleted. */
  const handleDeleteClientsByLastImportId = useCallback(async (sessionId: string): Promise<number> => {
    try {
      const count = await clientService.deleteByLastImportId(sessionId, outletID);
      console.log('Undo import: deleted', count, 'clients for session', sessionId);
      return count;
    } catch (err: any) {
      console.error('Error undoing import:', err);
      setError(err.message || 'Failed to undo import');
      throw err;
    }
  }, [outletID]);

  /** Delete all clients in the current outlet. Returns count deleted. */
  const handleDeleteAllClients = useCallback(async (): Promise<number> => {
    try {
      const count = await clientService.deleteAll(outletID);
      console.log('Delete all: removed', count, 'clients');
      return count;
    } catch (err: any) {
      console.error('Error deleting all clients:', err);
      setError(err.message || 'Failed to delete all members');
      throw err;
    }
  }, [outletID]);

  /** Update member credit (top-up or deduction) and log to credit_history. amount: positive = topup, negative = deduction. */
  const handleUpdateClientCredit = useCallback(
    async (
      clientId: string,
      amount: number,
      type: 'topup' | 'deduction',
      staffRemark: string,
      staffName: string,
      transactionId?: string
    ): Promise<number> => {
      if (!outletID?.trim()) throw new Error('No outlet assigned.');

      const { adjustClientCredit } = await import('../services/supabaseMerchant');
      return adjustClientCredit({
        clientId,
        outletID,
        type,
        amount: Math.abs(amount),
        staffRemark,
        staffName,
        transactionId,
      });
    },
    [outletID]
  );

  const handleRedeemVoucher = useCallback(
    async (clientId: string) => {
      if (!outletID?.trim()) throw new Error('No outlet assigned.');
      try {
        await clientService.redeemVoucher(clientId, outletID);
      } catch (err: any) {
        setError(err.message || 'Failed to redeem voucher');
        throw err;
      }
    },
    [outletID]
  );

  // Staff operations
  const handleAddStaff = useCallback(async (member: Omit<Staff, 'id' | 'outletID'> & { outletID?: string }) => {
    try {
      console.log('Adding staff to Firestore:', member, 'outletID:', outletID);
      // Ensure outletID is set
      const memberWithOutlet = {
        ...member,
        outletID: member.outletID || outletID
      };
      const id = await staffService.add(memberWithOutlet, outletID);
      console.log('✅ Staff added successfully with ID:', id);
      // Real-time listener will update automatically, no need to reload
      return id;
    } catch (err: any) {
      console.error('❌ Error adding staff:', err);
      const errorMsg = err.code === 'permission-denied' 
        ? 'Permission denied. Please check Firestore rules are deployed and user is authenticated.'
        : err.message || 'Failed to add staff';
      setError(errorMsg);
      // Show alert to user
      alert(`Failed to save staff: ${errorMsg}\n\nCheck browser console for details.`);
      throw err;
    }
  }, [outletID]);

  const handleUpdateStaff = useCallback(async (updatedMember: Staff) => {
    try {
      console.log('Updating staff in Firestore:', updatedMember.id);
      await staffService.update(updatedMember.id, updatedMember, outletID);
      // Real-time listener will update automatically
    } catch (err: any) {
      console.error('Error updating staff:', err);
      setError(err.message || 'Failed to update staff');
      throw err;
    }
  }, [outletID]);

  const handleDeleteStaff = useCallback(async (id: string) => {
    try {
      console.log('Deleting staff from Firestore:', id);
      await staffService.delete(id, outletID);
      // Real-time listener will update automatically
    } catch (err: any) {
      console.error('Error deleting staff:', err);
      setError(err.message || 'Failed to delete staff');
      throw err;
    }
  }, [outletID]);

  // Appointment operations
  const handleAddAppointment = useCallback(async (newApp: Appointment) => {
    try {
      console.log('Adding appointment to Firestore:', newApp);
      const id = await appointmentService.add(newApp, outletID);
      console.log('Appointment added successfully with ID:', id);
      // Real-time listener will update automatically
      return id;
    } catch (err: any) {
      console.error('Error adding appointment:', err);
      setError(err.message || 'Failed to add appointment');
      throw err;
    }
  }, [outletID]);

  const handleUpdateAppointmentStatus = useCallback(async (id: string, status?: Appointment['status'], updates?: Partial<Appointment>) => {
    try {
      console.log('Updating appointment:', id, status, updates);

      const existing = await appointmentService.getById(id, outletID);
      if (!existing) {
        console.warn(`Appointment ${id} not found - may have been deleted (e.g., when sale was voided). Skipping update.`);
        return;
      }
      
      if (status !== undefined) {
        await appointmentService.updateStatus(id, status, outletID);
      }
      if (updates) {
        await appointmentService.update(id, updates, outletID);
      }
      // Real-time listener will update automatically
    } catch (err: any) {
      // If appointment was already deleted, log warning instead of error
      if (err.message?.includes('not found') || err.message?.includes('Appointment not found')) {
        console.warn(`Appointment ${id} was deleted before update could complete. This is expected when sales are voided/deleted.`);
        return; // Don't throw error - appointment cleanup is working as intended
      }
      console.error('Error updating appointment:', err);
      setError(err.message || 'Failed to update appointment');
      throw err;
    }
  }, [outletID]);

  const handleDeleteAppointment = useCallback(async (appointmentId: string) => {
    const id = typeof appointmentId === 'string' ? appointmentId.trim() : '';
    if (!id) {
      console.error('handleDeleteAppointment: invalid or missing appointmentId', appointmentId);
      setError('Cannot delete: invalid appointment ID.');
      throw new Error('Invalid appointment ID');
    }
    if (!outletID?.trim()) {
      const errorMsg = 'Cannot delete appointment: No outlet assigned.';
      console.error(errorMsg);
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      console.log('🗑️ Deleting appointment:', id, 'outletID:', outletID);
      let appointment = await appointmentService.getById(id, outletID);

      if (!appointment) {
        console.warn(`⚠️ Appointment ${id} not found. Checking again after short delay...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        appointment = await appointmentService.getById(id, outletID);
        if (!appointment) {
          console.log(`ℹ️ Appointment ${id} confirmed deleted (likely by another process).`);
          return;
        }
        console.log(`✅ Appointment ${id} found on retry, proceeding with deletion.`);
      }

      if (appointment.outletID !== outletID) {
        const errorMsg = `Appointment ${id} belongs to outlet ${appointment.outletID}, but current outlet is ${outletID}`;
        console.error('❌', errorMsg);
        throw new Error('Appointment does not belong to this outlet');
      }

      await appointmentService.delete(id, outletID);
      console.log('✅ Appointment deleted successfully:', id);

      // Delete the linked sale from Firestore so it is removed from Sales History (same as when user deletes the sale in Sales History).
      const linkedSaleId = (appointment.saleId || (appointment as any).sourceSaleId)?.trim();
      if (linkedSaleId && deleteTransactionRef.current) {
        try {
          await deleteTransactionRef.current(linkedSaleId);
          console.log('✅ Linked sale deleted from Sales History:', linkedSaleId);
        } catch (delErr: any) {
          if (delErr.message?.includes('Transaction not found')) {
            console.log('ℹ️ Linked sale already missing:', linkedSaleId);
          } else {
            console.warn('Could not delete linked sale after appointment delete:', linkedSaleId, delErr);
          }
        }
      }

      // Realtime refresh will update appointments state.
    } catch (err: any) {
      console.error('❌ Error deleting appointment:', err);
      console.error('Error details:', {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      
      // If appointment was already deleted, silently return
      if (err.message?.includes('not found') || err.message?.includes('Appointment not found')) {
        console.log('ℹ️ Appointment was already deleted, ignoring error');
        return;
      }
      
      // Re-throw error so UI can show it to user
      setError(err.message || 'Failed to delete appointment');
      throw err;
    }
  }, [outletID]);

  // Transaction operations
  const handleAddTransaction = useCallback(async (txn: Transaction) => {
    // Multi-tenant: must have a valid outlet or Firestore write will fail / go to wrong place
    if (!hasOutlet || !outletID?.trim()) {
      const msg = 'No outlet assigned. Cannot save transaction. Ensure your user has an outletId in the users collection (see USERS_AND_OUTLETS.md).';
      setError(msg);
      throw new Error(msg);
    }
    try {
      console.log('Adding transaction to Firestore:', txn, 'outletID:', outletID);
      
      // Ensure transaction has outletID (required for Firestore rules; cashier user must have outletId in users doc)
      const transactionWithOutlet: Transaction = {
        ...txn,
        outletID: (txn.outletID?.trim() || outletID).trim()
      };

      const id = await transactionService.add(transactionWithOutlet, outletID);
      console.log('✅ Transaction added successfully with ID:', id);

      // Voucher redemption sale: decrement member voucher count by 1 (voucher already paid in the past).
      if (
        transactionWithOutlet.type === TransactionType.SALE &&
        transactionWithOutlet.clientId &&
        transactionWithOutlet.clientId !== 'guest' &&
        (transactionWithOutlet.paymentMethod === 'Voucher' || transactionWithOutlet.category === 'Voucher')
      ) {
        try {
          await clientService.redeemVoucher(transactionWithOutlet.clientId, outletID);
          console.log('✅ Voucher redeemed for member:', transactionWithOutlet.clientId);
        } catch (voucherErr: any) {
          console.warn('Could not redeem voucher for member (sale already saved):', voucherErr?.message);
        }
      }

      // On package sale: add vouchers = total services in package(s). E.g. package "5x Full Body" → 5 vouchers; member redeems 1 per visit.
      // Skip for Voucher redemption sales (member is using a voucher, not earning new ones).
      if (
        transactionWithOutlet.type === TransactionType.SALE &&
        transactionWithOutlet.clientId &&
        transactionWithOutlet.items?.length &&
        transactionWithOutlet.paymentMethod !== 'Voucher' &&
        transactionWithOutlet.category !== 'Voucher'
      ) {
        let vouchersToAdd = 0;
        for (const item of transactionWithOutlet.items) {
          if (item.type !== 'package') continue;
          const pkg = packages.find((p) => p.id === item.id);
          const totalServicesInPackage = pkg?.services?.length
            ? pkg.services.reduce((sum, ps) => sum + (ps.quantity ?? 0), 0)
            : 1;
          const cartQty = item.quantity ?? 1;
          vouchersToAdd += cartQty * Math.max(1, totalServicesInPackage);
        }
        if (vouchersToAdd > 0) {
          try {
            await clientService.incrementVoucherCount(transactionWithOutlet.clientId, vouchersToAdd, outletID);
            console.log('✅ Vouchers added for member:', transactionWithOutlet.clientId, '+', vouchersToAdd);
          } catch (voucherErr: any) {
            console.warn('Could not add vouchers for member (sale already saved):', voucherErr?.message);
          }
        }
      }

      // Exactly ONE commission expense per sale, only after sale is saved. Created only when
      // there is at least one line item with assigned staff; description always includes staff details.
      if (transactionWithOutlet.type === TransactionType.SALE && transactionWithOutlet.items?.length) {
        if (commissionCreatedForSaleIds.has(id)) {
          console.log('Commission already created for this sale (in-memory guard), skipping.');
          return id;
        }

        const listCommissionsForSale = async () => {
          const children = await transactionService.listByParentSaleId(id, outletID);
          return children.filter((t) => t.category === 'Commission');
        };

        const existing = await listCommissionsForSale();
        if (existing.length > 0) {
          commissionCreatedForSaleIds.add(id);
          console.log('Commission already recorded for this sale, skipping duplicate.');
          return id;
        }
        // Claim this sale id before building commission so concurrent runs don't both create
        commissionCreatedForSaleIds.add(id);

        // Only items with assigned staff get commission; never create "Commission: Service" without staff
        const commissionByKey = new Map<string, { staffId: string; name: string; amount: number }>();
        for (const item of transactionWithOutlet.items) {
          if (!item.staffId || !item.commissionEarned || item.commissionEarned <= 0) continue;
          const key = `${item.staffId}|${item.id}`;
          const existingGroup = commissionByKey.get(key);
          const amount = (existingGroup?.amount ?? 0) + item.commissionEarned;
          commissionByKey.set(key, {
            staffId: item.staffId,
            name: existingGroup?.name ?? item.name,
            amount
          });
        }
        if (commissionByKey.size === 0) return id;

        // Single commission doc: total amount + description with staff name for each line (e.g. "Commission: Neneng - Foot")
        let totalCommission = 0;
        const parts: string[] = [];
        for (const [, group] of commissionByKey) {
          totalCommission += group.amount;
          const staffMember = staff.find(s => s.id === group.staffId);
          const staffLabel = staffMember?.name || group.staffId || 'Assigned Staff';
          parts.push(`${staffLabel} - ${group.name}`);
        }
        const description = `Commission: ${parts.join('; ')}`;
        const commissionTxn: Transaction = {
          id: `comm_${id}_${Date.now()}`,
          outletID: transactionWithOutlet.outletID,
          date: transactionWithOutlet.date,
          type: TransactionType.EXPENSE,
          amount: totalCommission,
          category: 'Commission',
          description,
          parentSaleId: id
        };
        // Re-check right before write to avoid race where another tab/process created commission
        const recheck = await listCommissionsForSale();
        if (recheck.length > 0) {
          console.log('Commission already recorded for this sale (re-check), skipping.');
          return id;
        }
        await transactionService.add(commissionTxn, outletID);
        console.log('Commission transaction added (single doc per sale, with staff details)');

        // Cleanup duplicate commissions (admin and cashier can delete per Firestore rules)
        // Cleanup 1: remove duplicate commissions for THIS sale (same parentSaleId) that lack staff in description
        const allForSale = await listCommissionsForSale();
        if (allForSale.length > 1) {
          const toDelete: string[] = [];
          allForSale.forEach((t) => {
            const desc = t.description || '';
            if (!desc.includes(' - ')) toDelete.push(t.id);
          });
          for (const docId of toDelete) {
            try {
              await transactionService.delete(docId, outletID);
              console.log('Removed duplicate commission (no staff in description):', docId);
            } catch (e) {
              console.warn('Could not remove duplicate commission:', docId, e);
            }
          }
        }

      }

      // Update client points if it's a sale (single place — idempotent by saleId to prevent double-counting).
      // Skip for Redemption (points used) and Voucher (no payment, no points earned).
      if (
        transactionWithOutlet.type === TransactionType.SALE &&
        transactionWithOutlet.clientId &&
        transactionWithOutlet.clientId !== 'guest' &&
        transactionWithOutlet.category !== 'Redemption' &&
        transactionWithOutlet.category !== 'Voucher'
      ) {
        let earnedPoints = 0;
        if (transactionWithOutlet.items && transactionWithOutlet.items.length > 0) {
          earnedPoints = transactionWithOutlet.items.reduce((sum, item) => {
            const itemPoints = item.points !== undefined ? item.points : Math.floor(item.price);
            return sum + (itemPoints * item.quantity);
          }, 0);
        } else {
          earnedPoints = Math.floor(transactionWithOutlet.amount);
        }

        if (earnedPoints > 0) {
          const clientId = transactionWithOutlet.clientId;
          console.log('Adding points:', earnedPoints, 'for Client:', clientId, 'saleId:', id);
          await clientService.updatePointsForSale(clientId, earnedPoints, id, outletID);
        }
      }

      // Real-time listener will update automatically
      return id;
    } catch (err: any) {
      console.error('❌ Error adding transaction:', err);
      const errorMsg = err.code === 'permission-denied' 
        ? 'Permission denied. Please check Firestore rules are deployed and user is authenticated.'
        : err.message || 'Failed to add transaction';
      setError(errorMsg);
      // Show alert to user
      alert(`Failed to save transaction: ${errorMsg}\n\nCheck browser console for details.`);
      throw err;
    }
  }, [outletID, hasOutlet, staff, packages]);

  const handleUpdateTransaction = useCallback(async (id: string, updatedData: Partial<Transaction>) => {
    try {
      console.log('Updating transaction in Firestore:', id, updatedData);
      await transactionService.update(id, updatedData, outletID);
      // Real-time listener will update automatically
    } catch (err: any) {
      console.error('Error updating transaction:', err);
      setError(err.message || 'Failed to update transaction');
      throw err;
    }
  }, [outletID]);

  const handleDeleteTransaction = useCallback(async (id: string) => {
    try {
      console.log('Deleting transaction:', id);

      const txnData = await transactionService.getById(id, outletID);
        if (!txnData) throw new Error('Transaction not found');
        if (txnData.outletID !== outletID) {
          throw new Error('Transaction does not belong to this outlet');
        }

        const linkedAppts = await appointmentService.listBySaleId(id, outletID);
        for (const appt of linkedAppts) {
          await appointmentService.delete(appt.id, outletID);
        }
        if (linkedAppts.length > 0) {
          console.log('Deleted', linkedAppts.length, 'appointment(s) linked to sale', id);
        }

        const children = await transactionService.listByParentSaleId(id, outletID);
        const commissions = children.filter((t) => t.category === 'Commission');
        for (const c of commissions) {
          await transactionService.delete(c.id, outletID);
        }
        if (commissions.length > 0) {
          console.log('Deleted', commissions.length, 'commission transaction(s) linked to sale', id);
        }

        let pointsDelta = 0;
        let clientId: string | undefined;
        let receiptNumber = id.replace(/\D/g, '').slice(-10) || id.slice(-8);
        receiptNumber = '#' + receiptNumber.padStart(10, '0');
        let vouchersToRemove = 0;
        let vouchersToRefund = 0;

        if (
          txnData.type === TransactionType.SALE &&
          txnData.clientId &&
          txnData.clientId !== 'guest'
        ) {
          clientId = txnData.clientId;
          if (txnData.paymentMethod === 'Voucher' || txnData.category === 'Voucher') {
            vouchersToRefund = 1;
          } else if (txnData.category === 'Redemption') {
            if (txnData.items?.length) {
              pointsDelta = txnData.items.reduce((sum, item: any) => {
                if (!item.redeemedWithPoints || !item.redeemPoints) return sum;
                return sum + item.redeemPoints * (item.quantity ?? 1);
              }, 0);
            }
          } else if (txnData.items?.length) {
            pointsDelta = -txnData.items.reduce((sum, item: any) => {
              const itemPoints = item.points !== undefined ? item.points : Math.floor(item.price);
              return sum + itemPoints * item.quantity;
            }, 0);
            for (const item of txnData.items) {
              if (item.type !== 'package') continue;
              const pkg = packages.find((p: Package) => p.id === item.id);
              const totalServices = pkg?.services?.length
                ? pkg.services.reduce((s: number, ps: any) => s + (ps.quantity ?? 0), 0)
                : 1;
              vouchersToRemove += (item.quantity ?? 1) * Math.max(1, totalServices);
            }
          } else {
            pointsDelta = -Math.floor(txnData.amount);
          }
        }

        if (clientId && pointsDelta < 0) {
          await pointTransactionService.deductForSaleDeletion(
            clientId,
            Math.abs(pointsDelta),
            receiptNumber.replace(/^#/, ''),
            outletID
          );
        } else if (clientId && pointsDelta > 0) {
          await pointTransactionService.add(clientId, 'Topup', pointsDelta, outletID);
        }
        if (clientId && vouchersToRemove > 0) {
          await clientService.decrementVoucherCount(clientId, vouchersToRemove, outletID);
        }
        if (clientId && vouchersToRefund > 0) {
          await clientService.incrementVoucherCount(clientId, vouchersToRefund, outletID);
        }

        await transactionService.delete(id, outletID);
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      setError(err.message || 'Failed to delete transaction');
      throw err;
    }
  }, [outletID, packages]);

  const handleVoidTransaction = useCallback(async (id: string) => {
    try {
      console.log('Voiding transaction:', id);

      const txnData = await transactionService.getById(id, outletID);
      if (!txnData) throw new Error('Transaction not found');
      if (txnData.outletID !== outletID) {
        throw new Error('Transaction does not belong to this outlet');
      }
      if (txnData.status === 'voided') {
        throw new Error('Transaction is already voided');
      }

      let pointsDelta = 0;
      let clientId: string | undefined;
      let vouchersToRemove = 0;
      let vouchersToRefund = 0;
      let receiptNumber = id.replace(/\D/g, '').slice(-10) || id.slice(-8);
      receiptNumber = '#' + receiptNumber.padStart(10, '0');

      if (
        txnData.type === TransactionType.SALE &&
        txnData.clientId &&
        txnData.clientId !== 'guest'
      ) {
        clientId = txnData.clientId;
        if (txnData.paymentMethod === 'Voucher' || txnData.category === 'Voucher') {
          vouchersToRefund = 1;
        } else if (txnData.category === 'Redemption') {
          if (txnData.items?.length) {
            pointsDelta = txnData.items.reduce((sum, item: any) => {
              if (!item.redeemedWithPoints || !item.redeemPoints) return sum;
              return sum + item.redeemPoints * (item.quantity ?? 1);
            }, 0);
          }
        } else if (txnData.items?.length) {
          pointsDelta = -txnData.items.reduce((sum, item: any) => {
            const itemPoints = item.points !== undefined ? item.points : Math.floor(item.price);
            return sum + itemPoints * item.quantity;
          }, 0);
          for (const item of txnData.items) {
            if (item.type !== 'package') continue;
            const pkg = packages.find((p: Package) => p.id === item.id);
            const totalServices = pkg?.services?.length
              ? pkg.services.reduce((s: number, ps: any) => s + (ps.quantity ?? 0), 0)
              : 1;
            vouchersToRemove += (item.quantity ?? 1) * Math.max(1, totalServices);
          }
        } else {
          pointsDelta = -Math.floor(txnData.amount);
        }
      }

      await transactionService.update(id, { status: 'voided' }, outletID);

      if (clientId && pointsDelta < 0) {
        await pointTransactionService.deductForSaleDeletion(
          clientId,
          Math.abs(pointsDelta),
          receiptNumber.replace(/^#/, ''),
          outletID
        );
      } else if (clientId && pointsDelta > 0) {
        await pointTransactionService.add(clientId, 'Topup', pointsDelta, outletID);
      }
      if (clientId && vouchersToRemove > 0) {
        await clientService.decrementVoucherCount(clientId, vouchersToRemove, outletID);
      }
      if (clientId && vouchersToRefund > 0) {
        await clientService.incrementVoucherCount(clientId, vouchersToRefund, outletID);
      }

      const linkedAppts = await appointmentService.listBySaleId(id, outletID);
      for (const appt of linkedAppts) {
        await appointmentService.delete(appt.id, outletID);
      }
      if (linkedAppts.length > 0) {
        console.log('Deleted', linkedAppts.length, 'appointment(s) linked to voided sale', id);
      }

      const children = await transactionService.listByParentSaleId(id, outletID);
      const commissions = children.filter((t) => t.category === 'Commission');
      for (const c of commissions) {
        await transactionService.delete(c.id, outletID);
      }
      if (commissions.length > 0) {
        console.log('Deleted', commissions.length, 'commission transaction(s) linked to voided sale', id);
      }
    } catch (err: any) {
      console.error('Error voiding transaction:', err);
      setError(err.message || 'Failed to void transaction');
      throw err;
    }
  }, [outletID, packages]);

  useEffect(() => {
    deleteTransactionRef.current = handleDeleteTransaction;
  }, [handleDeleteTransaction]);

  // Service operations
  const handleAddService = useCallback(async (newService: Service) => {
    try {
      console.log('Adding service to Firestore:', newService);
      const id = await serviceService.add(newService, outletID);
      // Real-time listener will update automatically
      return id;
    } catch (err: any) {
      console.error('Error adding service:', err);
      setError(err.message || 'Failed to add service');
      throw err;
    }
  }, [outletID]);

  const handleUpdateService = useCallback(async (updatedService: Service) => {
    try {
      console.log('Updating service in Firestore:', updatedService.id);
      await serviceService.update(updatedService.id, updatedService, outletID);
      // Real-time listener will update automatically
    } catch (err: any) {
      console.error('Error updating service:', err);
      setError(err.message || 'Failed to update service');
      throw err;
    }
  }, [outletID]);

  const handleDeleteService = useCallback(async (id: string) => {
    try {
      console.log('Deleting service from Firestore:', id);
      // Get the service first to check for imageUrl
      const serviceToDelete = services.find(s => s.id === id);
      await serviceService.delete(id, outletID);
      // Delete associated image if it exists
      if (serviceToDelete?.imageUrl) {
        const { deleteImage } = await import('../services/storageService');
        await deleteImage(serviceToDelete.imageUrl);
      }
      // Real-time listener will update automatically
    } catch (err: any) {
      console.error('Error deleting service:', err);
      setError(err.message || 'Failed to delete service');
      throw err;
    }
  }, [outletID, services]);

  // Product operations
  const handleAddProduct = useCallback(async (newProduct: Product) => {
    try {
      console.log('Adding product to Firestore:', newProduct);
      const id = await productService.add(newProduct, outletID);
      // Real-time listener will update automatically
      return id;
    } catch (err: any) {
      console.error('Error adding product:', err);
      setError(err.message || 'Failed to add product');
      throw err;
    }
  }, [outletID]);

  const handleUpdateProduct = useCallback(async (updated: Product) => {
    try {
      console.log('Updating product in Firestore:', updated.id);
      await productService.update(updated.id, updated, outletID);
      // Real-time listener will update automatically
    } catch (err: any) {
      console.error('Error updating product:', err);
      setError(err.message || 'Failed to update product');
      throw err;
    }
  }, [outletID]);

  const handleDeleteProduct = useCallback(async (id: string) => {
    try {
      console.log('Deleting product from Firestore:', id);
      await productService.delete(id, outletID);
      // Real-time listener will update automatically
    } catch (err: any) {
      console.error('Error deleting product:', err);
      setError(err.message || 'Failed to delete product');
      throw err;
    }
  }, [outletID]);

  // Package operations
  const handleAddPackage = useCallback(async (newPackage: Package) => {
    try {
      console.log('Adding package to Firestore:', newPackage);
      const id = await packageService.add(newPackage, outletID);
      // Real-time listener will update automatically
      return id;
    } catch (err: any) {
      console.error('Error adding package:', err);
      setError(err.message || 'Failed to add package');
      throw err;
    }
  }, [outletID]);

  const handleUpdatePackage = useCallback(async (updated: Package) => {
    try {
      console.log('Updating package in Firestore:', updated.id);
      await packageService.update(updated.id, updated, outletID);
      // Real-time listener will update automatically
    } catch (err: any) {
      console.error('Error updating package:', err);
      setError(err.message || 'Failed to update package');
      throw err;
    }
  }, [outletID]);

  const handleDeletePackage = useCallback(async (id: string) => {
    try {
      console.log('Deleting package from Firestore:', id);
      await packageService.delete(id, outletID);
      // Real-time listener will update automatically
    } catch (err: any) {
      console.error('Error deleting package:', err);
      setError(err.message || 'Failed to delete package');
      throw err;
    }
  }, [outletID]);

  // Reward operations
  const handleUpdateRewards = useCallback(async (newRewards: Reward[]) => {
    try {
      console.log('Updating rewards in Firestore:', newRewards.length);
      // Diff against in-memory catalog (already loaded) — avoid full getAll refetch.
      const currentRewards = rewards;
      const currentIds = new Set(currentRewards.map(r => r.id));
      const newIds = new Set(newRewards.map(r => r.id));

      // Delete removed rewards
      for (const reward of currentRewards) {
        if (!newIds.has(reward.id)) {
          await rewardService.delete(reward.id, outletID);
        }
      }

      // Add/update rewards
      for (const reward of newRewards) {
        if (currentIds.has(reward.id)) {
          // Update existing reward
          const { id, ...updateData } = reward;
          await rewardService.update(id, updateData, outletID);
        } else {
          // Add new reward (remove id since Firestore will generate it)
          const { id, ...newRewardData } = reward;
          await rewardService.add(newRewardData, outletID);
        }
      }
      // Real-time listener will update automatically
    } catch (err: any) {
      console.error('Error updating rewards:', err);
      setError(err.message || 'Failed to update rewards');
      throw err;
    }
  }, [outletID, rewards]);

  const handleAddServiceCategory = useCallback(async (category: string) => {
    const name = (category || '').trim();
    if (!name || !hasOutlet || !outletID) return;
    if (serviceCategories.includes(name)) return;
    const next = [...serviceCategories, name];
    await outletService.updateServiceCategories(outletID, next);
    setServiceCategories(next);
  }, [outletID, hasOutlet, serviceCategories]);

  const handleUpdateServiceCategory = useCallback(async (oldName: string, newName: string) => {
    const name = (newName || '').trim();
    if (!name || !hasOutlet || !outletID) return;
    if (oldName === name) return;
    if (serviceCategories.includes(name)) return;
    const next = serviceCategories.map((c) => (c === oldName ? name : c));
    await outletService.updateServiceCategories(outletID, next);
    await Promise.all([
      serviceService.updateCategoryName(outletID, oldName, name),
      productService.updateCategoryName(outletID, oldName, name),
      packageService.updateCategoryName(outletID, oldName, name)
    ]);
    setServiceCategories(next);
  }, [outletID, hasOutlet, serviceCategories]);

  const handleDeleteServiceCategory = useCallback(async (category: string) => {
    if (!hasOutlet || !outletID) return;
    const next = serviceCategories.filter((c) => c !== category);
    await outletService.updateServiceCategories(outletID, next);
    setServiceCategories(next);
  }, [outletID, hasOutlet, serviceCategories]);

  const handleReorderServiceCategories = useCallback(async (orderedNames: string[]) => {
    if (!hasOutlet || !outletID) return;
    if (!Array.isArray(orderedNames) || orderedNames.length === 0) return;
    await outletService.updateServiceCategories(outletID, orderedNames);
    setServiceCategories(orderedNames);
  }, [outletID, hasOutlet]);

  return {
    // Data
    clients,
    staff,
    appointments,
    transactions,
    services,
    products,
    packages,
    rewards,
    serviceCategories,
    loading,
    error,

    // Operations
    loadData,
    handleAddClient,
    handleUpdateClient,
    handleUpdateClientPoints,
    handleDeleteClient,
    handleDeleteClientsByLastImportId,
    handleDeleteAllClients,
    handleUpdateClientCredit,
    handleRedeemVoucher,
    handleAddStaff,
    handleUpdateStaff,
    handleDeleteStaff,
    handleAddAppointment,
    handleUpdateAppointmentStatus,
    handleDeleteAppointment,
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
  };
};
