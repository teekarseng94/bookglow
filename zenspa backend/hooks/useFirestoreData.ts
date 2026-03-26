/**
 * React Hook for Firestore Data Management
 * 
 * This hook provides real-time data synchronization with Firestore
 * and replaces local state management with Firestore operations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { onSnapshot, query, where, orderBy, collection, Timestamp, getDocs, getDoc, doc, runTransaction, deleteDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
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
  getCurrentOutletID
} from '../services/firestoreService';
import { setCurrentOutletID as setPointTransactionOutletID } from '../services/pointTransactionService';
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

const NO_OUTLET_ERROR = 'No outlet assigned. Each user must be mapped to an outlet in the users collection.';

const DEFAULT_SERVICE_CATEGORIES = ['Massage', 'Facial', 'Nails', 'Aromatherapy', 'Packages'];

/** Sale document IDs we've already created commissions for this session (prevents duplicate if handler runs twice) */
const commissionCreatedForSaleIds = new Set<string>();

/** Role from users/{uid}: cashiers may only read/write SALE transactions (Firestore rules). */
export type FirestoreUserRole = 'admin' | 'cashier' | null;

export const useFirestoreData = (outletID: string, role: FirestoreUserRole = null) => {
  // Multi-tenant: outletID must come from the authenticated user's Firestore document (users/{uid}.outletId). No default.
  const hasOutlet = Boolean(outletID && String(outletID).trim());
  // Until role is known, use cashier-safe query (only SALE) so we don't get permission denied
  const isCashier = role !== 'admin';

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
    } else {
      setError(null);
    }
  }, [hasOutlet]);

  // Load all data (only when we have a valid outlet)
  const loadData = useCallback(async () => {
    if (!hasOutlet) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      // Load service categories first (single-doc read, no composite index). So categories
      // persist after refresh even when other queries fail (e.g. missing Firestore index).
      let categoriesList: string[] = DEFAULT_SERVICE_CATEGORIES;
      try {
        const categoriesData = await outletService.getServiceCategories(outletID);
        categoriesList = Array.isArray(categoriesData) && categoriesData.length > 0
          ? categoriesData
          : DEFAULT_SERVICE_CATEGORIES;
        if (!Array.isArray(categoriesData) || categoriesData.length === 0) {
          await outletService.updateServiceCategories(outletID, categoriesList);
        }
      } catch (catErr: any) {
        console.warn('Could not load service categories:', catErr?.message || catErr);
      }
      setServiceCategories(categoriesList);

      const [
        clientsData,
        staffData,
        appointmentsData,
        transactionsData,
        servicesData,
        productsData,
        packagesData,
        rewardsData
      ] = await Promise.all([
        clientService.getAll(outletID),
        staffService.getAll(outletID),
        appointmentService.getAll(outletID),
        transactionService.getAll(outletID),
        serviceService.getAll(outletID),
        productService.getAll(outletID),
        packageService.getAll(outletID),
        rewardService.getAll(outletID)
      ]);

      setClients(clientsData);
      setStaff(staffData);
      setAppointments(appointmentsData);
      setTransactions(transactionsData);
      setServices(servicesData);
      setProducts(productsData);
      setPackages(packagesData);
      setRewards(rewardsData);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
      // Service categories were already set above; if another query failed (e.g. missing index),
      // try loading only categories so saved categories still appear after refresh
      try {
        const categoriesData = await outletService.getServiceCategories(outletID);
        const list = Array.isArray(categoriesData) && categoriesData.length > 0
          ? categoriesData
          : DEFAULT_SERVICE_CATEGORIES;
        setServiceCategories(list);
      } catch (_) {
        // keep existing serviceCategories state
      }
    } finally {
      setLoading(false);
    }
  }, [outletID, hasOutlet]);

  // Initial one-time load for collections that don't have real-time listeners (e.g. outlet serviceCategories)
  useEffect(() => {
    if (!hasOutlet || !outletID) return;
    // Fire and forget; errors are handled inside loadData
    loadData();
  }, [hasOutlet, outletID, loadData]);

  // Set up real-time listeners for all collections (only when user has an assigned outlet)
  useEffect(() => {
    if (!hasOutlet || !outletID) return;

    console.log('Setting up Firestore real-time listeners for outlet:', outletID);
    
    const unsubscribeFunctions: (() => void)[] = [];

    // Clients listener
    const clientsQuery = query(
      collection(db, 'clients'),
      where('outletID', '==', outletID)
    );
    const unsubscribeClients = onSnapshot(
      clientsQuery,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Client));
        console.log('Clients updated:', data.length);
        setClients(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error in clients listener:', error);
        setError(error.message || 'Failed to load clients');
        setLoading(false);
      }
    );
    unsubscribeFunctions.push(unsubscribeClients);

    // Staff listener
    // Note: orderBy with where requires composite index
    const staffQuery = query(
      collection(db, 'staff'),
      where('outletID', '==', outletID)
      // Removed orderBy to avoid index requirement - can sort in memory if needed
    );
    const unsubscribeStaff = onSnapshot(
      staffQuery,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Staff));
        // Sort by createdAt in memory if available
        data.sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bDate - aDate;
        });
        console.log('Staff updated:', data.length);
        setStaff(data);
      },
      (error) => {
        console.error('Error in staff listener:', error);
        // Don't set error state for listener errors, just log
        console.warn('Staff listener error (non-blocking):', error.message);
      }
    );
    unsubscribeFunctions.push(unsubscribeStaff);

    // Appointments (bookings) listener — single source of truth for appointments state.
    // Only listens to the appointments collection; when a doc is deleted, docChanges() returns change.type === 'removed' and we remove it from state immediately so UI and DB stay in sync.
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('outletID', '==', outletID)
    );
    const unsubscribeAppointments = onSnapshot(
      appointmentsQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const changes = snapshot.docChanges();
        const removedIds = new Set<string>();
        const addedOrModified: Appointment[] = [];

        changes.forEach((change) => {
          const docId = change.doc.id;
          // Ignore legacy On Duty documents (no longer created; filter so they never appear in state)
          if (docId.startsWith('app_onduty_')) return;
          if (change.type === 'removed') {
            removedIds.add(docId);
          } else if (change.type === 'added' || change.type === 'modified') {
            if (!change.doc.exists()) return;
            const docData = change.doc.data();
            if (!docData) return;
            // Use Firestore document id as canonical id so delete/update use the real doc id (not any id stored in doc body)
            const data = { ...docData, id: docId } as Appointment;
            if (data.outletID && data.date) addedOrModified.push(data);
          }
        });

        // Single source of truth: only this listener updates appointments state. On 'removed', that id is removed from state immediately.
        setAppointments((prevAppointments) => {
          const filtered = prevAppointments.filter(
            (app) => !removedIds.has(app.id) && !app.id.startsWith('app_onduty_')
          );
          const existingMap = new Map(filtered.map((app) => [app.id, app]));
          addedOrModified.forEach((app) => existingMap.set(app.id, app));
          const merged = Array.from(existingMap.values());
          merged.sort((a, b) => {
            const aDate = a.date ? new Date(a.date + 'T' + (a.time || '00:00')).getTime() : 0;
            const bDate = b.date ? new Date(b.date + 'T' + (b.time || '00:00')).getTime() : 0;
            return bDate - aDate;
          });
          return merged;
        });
      },
      (error) => {
        console.error('Error in appointments listener:', error);
        console.warn('Appointments listener error (non-blocking):', error.message);
      }
    );
    unsubscribeFunctions.push(unsubscribeAppointments);

    // Transactions listener — cashiers only allowed to read type=='SALE' per Firestore rules
    const transactionsConstraints = [where('outletID', '==', outletID)];
    if (isCashier) {
      transactionsConstraints.push(where('type', '==', TransactionType.SALE));
    }
    const transactionsQuery = query(
      collection(db, 'transactions'),
      ...transactionsConstraints
    );
    const unsubscribeTransactions = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const raw = doc.data();
          // Normalize date: Firestore returns Timestamp, app expects ISO string
          const date = raw.date instanceof Timestamp
            ? raw.date.toDate().toISOString()
            : (typeof raw.date === 'string' ? raw.date : raw.date?.toDate?.()?.toISOString?.() ?? '');
          return {
            id: doc.id,
            ...raw,
            date
          } as Transaction;
        });
        // Sort by date in memory (newest first)
        data.sort((a, b) => {
          const aDate = a.date ? new Date(a.date).getTime() : 0;
          const bDate = b.date ? new Date(b.date).getTime() : 0;
          return bDate - aDate;
        });
        console.log('Transactions updated:', data.length);
        setTransactions(data);
      },
      (error) => {
        console.error('Error in transactions listener:', error);
        console.warn('Transactions listener error (non-blocking):', error.message);
      }
    );
    unsubscribeFunctions.push(unsubscribeTransactions);

    // Services listener
    const servicesQuery = query(
      collection(db, 'services'),
      where('outletID', '==', outletID)
    );
    const unsubscribeServices = onSnapshot(
      servicesQuery,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Service));
        console.log('Services updated:', data.length);
        setServices(data);
      },
      (error) => {
        console.error('Error in services listener:', error);
        setError(error.message || 'Failed to load services');
      }
    );
    unsubscribeFunctions.push(unsubscribeServices);

    // Products listener
    const productsQuery = query(
      collection(db, 'products'),
      where('outletID', '==', outletID)
    );
    const unsubscribeProducts = onSnapshot(
      productsQuery,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Product));
        console.log('Products updated:', data.length);
        setProducts(data);
      },
      (error) => {
        console.error('Error in products listener:', error);
        setError(error.message || 'Failed to load products');
      }
    );
    unsubscribeFunctions.push(unsubscribeProducts);

    // Packages listener
    const packagesQuery = query(
      collection(db, 'packages'),
      where('outletID', '==', outletID)
    );
    const unsubscribePackages = onSnapshot(
      packagesQuery,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Package));
        console.log('Packages updated:', data.length);
        setPackages(data);
      },
      (error) => {
        console.error('Error in packages listener:', error);
        setError(error.message || 'Failed to load packages');
      }
    );
    unsubscribeFunctions.push(unsubscribePackages);

    // Rewards listener
    const rewardsQuery = query(
      collection(db, 'rewards'),
      where('outletID', '==', outletID)
      // No orderBy to avoid requiring composite index - sort in memory instead
    );
    const unsubscribeRewards = onSnapshot(
      rewardsQuery,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Reward));
        // Sort by cost in ascending order
        data.sort((a, b) => a.cost - b.cost);
        console.log('Rewards updated:', data.length);
        setRewards(data);
      },
      (error) => {
        console.error('Error in rewards listener:', error);
        setError(error.message || 'Failed to load rewards');
      }
    );
    unsubscribeFunctions.push(unsubscribeRewards);

    // Cleanup function
    return () => {
      console.log('Cleaning up Firestore listeners');
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }, [outletID, isCashier]);

  // Client operations
  const handleAddClient = useCallback(async (client: Omit<Client, 'id' | 'points'> & { points?: number }) => {
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
      const clientRef = doc(db, 'clients', clientId);
      const creditHistoryRef = doc(collection(db, 'clients', clientId, 'credit_history'));
      let newBalance = 0;
      await runTransaction(db, async (transaction) => {
        const clientSnap = await transaction.get(clientRef);
        if (!clientSnap.exists()) throw new Error('Client not found');
        const data = clientSnap.data();
        if (data?.outletID !== outletID) throw new Error('Client does not belong to this outlet');
        const currentCredit = Number(data?.credit ?? 0);
        const delta = type === 'topup' ? Math.abs(amount) : -Math.abs(amount);
        newBalance = currentCredit + delta;
        if (newBalance < 0) throw new Error('Insufficient credit balance.');
        transaction.update(clientRef, { credit: increment(delta) });
        transaction.set(creditHistoryRef, {
          type,
          amount: Math.abs(amount),
          newBalance,
          staffRemark: staffRemark.trim() || (type === 'topup' ? 'Top up' : 'Deduction'),
          staffName,
          timestamp: new Date().toISOString(),
          ...(transactionId ? { transactionId } : {})
        });
      });
      return newBalance;
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
  const handleAddStaff = useCallback(async (member: Omit<Staff, 'id'>) => {
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
      console.log('Updating appointment in Firestore:', id, status, updates);
      
      // Check if appointment still exists before attempting update
      const appointmentRef = doc(db, 'appointments', id);
      const appointmentDoc = await getDoc(appointmentRef);
      
      if (!appointmentDoc.exists()) {
        console.warn(`Appointment ${id} not found - may have been deleted (e.g., when sale was voided). Skipping update.`);
        return; // Silently return - appointment was likely deleted when sale was voided/deleted
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
      console.log('🗑️ Deleting appointment from Firestore:', id, 'outletID:', outletID);
      // Document path must be collection (1) + documentId (2) = 2 segments. Never pass empty/undefined id.
      const appointmentRef = doc(db, 'appointments', id);
      let appointmentDoc = await getDoc(appointmentRef);
      
      if (!appointmentDoc.exists()) {
        console.warn(`⚠️ Appointment ${id} not found in Firestore. Checking again after short delay...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        appointmentDoc = await getDoc(appointmentRef);
        if (!appointmentDoc.exists()) {
          console.log(`ℹ️ Appointment ${id} confirmed deleted (likely by another process).`);
          return;
        }
        console.log(`✅ Appointment ${id} found on retry, proceeding with deletion.`);
      }
      
      const appointmentData = appointmentDoc.data();
      if (!appointmentData) {
        throw new Error('Failed to retrieve appointment data');
      }
      if (appointmentData.outletID !== outletID) {
        const errorMsg = `Appointment ${id} belongs to outlet ${appointmentData.outletID}, but current outlet is ${outletID}`;
        console.error('❌', errorMsg);
        throw new Error('Appointment does not belong to this outlet');
      }
      
      await deleteDoc(appointmentRef);
      console.log('✅ Appointment deleted successfully:', id);

      // Delete the linked sale from Firestore so it is removed from Sales History (same as when user deletes the sale in Sales History).
      const linkedSaleId = (appointmentData.saleId || appointmentData.sourceSaleId)?.trim();
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

      // Do not update React state here — the onSnapshot listener is the only thing that updates appointments; it will receive change.type === 'removed' and remove this id from state.
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
        const existingCommissionsQuery = query(
          collection(db, 'transactions'),
          where('outletID', '==', outletID),
          where('parentSaleId', '==', id),
          where('category', '==', 'Commission')
        );
        const existingSnap = await getDocs(existingCommissionsQuery);
        if (!existingSnap.empty) {
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
          const existing = commissionByKey.get(key);
          const amount = (existing?.amount ?? 0) + item.commissionEarned;
          commissionByKey.set(key, {
            staffId: item.staffId,
            name: existing?.name ?? item.name,
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
        const recheckSnap = await getDocs(existingCommissionsQuery);
        if (!recheckSnap.empty) {
          console.log('Commission already recorded for this sale (re-check), skipping.');
          return id;
        }
        await transactionService.add(commissionTxn, outletID);
        console.log('Commission transaction added (single doc per sale, with staff details)');

        // Cleanup duplicate commissions (admin and cashier can delete per Firestore rules)
        // Cleanup 1: remove duplicate commissions for THIS sale (same parentSaleId) that lack staff in description
        const allForSale = await getDocs(existingCommissionsQuery);
        if (allForSale.size > 1) {
          const toDelete: string[] = [];
          allForSale.docs.forEach(d => {
            const desc = (d.data().description as string) || '';
            if (!desc.includes(' - ')) toDelete.push(d.id);
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

        // Cleanup 2: remove orphan commission docs (no parentSaleId or wrong format) created by old deployed code
        const recentCommissionsQuery = query(
          collection(db, 'transactions'),
          where('outletID', '==', outletID),
          where('category', '==', 'Commission'),
          where('type', '==', TransactionType.EXPENSE)
        );
        const recentSnap = await getDocs(recentCommissionsQuery);
        const saleTime = new Date(transactionWithOutlet.date).getTime();
        const toDeleteOrphans: string[] = [];
        recentSnap.docs.forEach(d => {
          const data = d.data();
          const desc = (data.description as string) || '';
          if (!desc.includes(' - ')) {
            const amount = Number(data.amount);
            const rawDate = data.date;
            const docDate = rawDate && typeof rawDate.toDate === 'function'
              ? rawDate.toDate().getTime()
              : new Date(rawDate).getTime();
            if (amount === totalCommission && !isNaN(docDate) && Math.abs(docDate - saleTime) < 120000) {
              toDeleteOrphans.push(d.id);
            }
          }
        });
        for (const docId of toDeleteOrphans) {
          try {
            await transactionService.delete(docId, outletID);
            console.log('Removed orphan duplicate commission (no staff, same time/amount):', docId);
          } catch (e) {
            console.warn('Could not remove orphan commission:', docId, e);
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
      console.log('Deleting transaction from Firestore:', id);
      
      // Get transaction before deletion to check if points need to be deducted
      const transactionRef = doc(db, 'transactions', id);
      const transactionDoc = await getDoc(transactionRef);
      
      if (!transactionDoc.exists()) {
        throw new Error('Transaction not found');
      }
      
      const txnData = transactionDoc.data();
      if (txnData.outletID !== outletID) {
        throw new Error('Transaction does not belong to this outlet');
      }

      // Delete linked appointments from the bookings (appointments) collection where saleId (or legacy sourceSaleId) matches.
      // Targets the appointments collection by saleId only — no app_onduty_ ID logic.
      const appointmentsRef = collection(db, 'appointments');
      const bySaleId = query(appointmentsRef, where('saleId', '==', id));
      const bySourceSaleId = query(appointmentsRef, where('sourceSaleId', '==', id));
      const [snapSaleId, snapSourceSaleId] = await Promise.all([getDocs(bySaleId), getDocs(bySourceSaleId)]);
      const toDelete = new Set<string>();
      snapSaleId.docs.forEach((d) => toDelete.add(d.id));
      snapSourceSaleId.docs.forEach((d) => toDelete.add(d.id));
      for (const docId of toDelete) {
        await deleteDoc(doc(db, 'appointments', docId));
      }
      if (toDelete.size > 0) {
        console.log('Deleted', toDelete.size, 'appointment(s) linked to sale', id);
      }

      // Delete linked commission transaction(s) created for this sale (parentSaleId links commission to sale)
      const transactionsRef = collection(db, 'transactions');
      const commissionsQuery = query(
        transactionsRef,
        where('outletID', '==', outletID),
        where('parentSaleId', '==', id),
        where('category', '==', 'Commission')
      );
      const commissionsSnap = await getDocs(commissionsQuery);
      for (const commissionDoc of commissionsSnap.docs) {
        await deleteDoc(doc(db, 'transactions', commissionDoc.id));
      }
      if (commissionsSnap.docs.length > 0) {
        console.log('Deleted', commissionsSnap.docs.length, 'commission transaction(s) linked to sale', id);
      }
      
      // Calculate points adjustments for this sale (earn or refund) if it's a SALE with a client
      // For normal Sales we deduct previously-earned points on delete.
      // For Redemption sales we refund points that were used to redeem services.
      let pointsDelta = 0; // positive = add points back, negative = deduct
      let clientId: string | undefined;
      let receiptNumber = id.replace(/\D/g, '').slice(-10) || id.slice(-8);
      receiptNumber = '#' + receiptNumber.padStart(10, '0');
      
      let vouchersToRemove = 0;
      let vouchersToRefund = 0; // When a Voucher redemption sale is deleted, refund 1 voucher
      if (
        txnData.type === TransactionType.SALE &&
        txnData.clientId &&
        txnData.clientId !== 'guest'
      ) {
        clientId = txnData.clientId;
        if (txnData.paymentMethod === 'Voucher' || txnData.category === 'Voucher') {
          vouchersToRefund = 1;
        } else if (txnData.category === 'Redemption') {
          // POS redemption sale: refund points that were used for redeemed lines
          if (txnData.items && txnData.items.length > 0) {
            const redeemedPoints = txnData.items.reduce((sum: number, item: any) => {
              if (!item.redeemedWithPoints || !item.redeemPoints) return sum;
              return sum + (item.redeemPoints * (item.quantity ?? 1));
            }, 0);
            pointsDelta = redeemedPoints; // add back
          }
        } else {
          // Normal sale: deduct points that were previously earned
          if (txnData.items && txnData.items.length > 0) {
            const pointsToDeduct = txnData.items.reduce((sum: number, item: any) => {
              const itemPoints = item.points !== undefined ? item.points : Math.floor(item.price);
              return sum + (itemPoints * item.quantity);
            }, 0);
            pointsDelta = -pointsToDeduct;
            // Vouchers granted for package items (same formula as on sale)
            for (const item of txnData.items) {
              if (item.type !== 'package') continue;
              const pkg = packages.find((p: Package) => p.id === item.id);
              const totalServices = pkg?.services?.length ? pkg.services.reduce((s: number, ps: any) => s + (ps.quantity ?? 0), 0) : 1;
              vouchersToRemove += (item.quantity ?? 1) * Math.max(1, totalServices);
            }
          } else {
            const pointsToDeduct = Math.floor(txnData.amount);
            pointsDelta = -pointsToDeduct;
          }
        }
      }

      const hasClientAdjustments = clientId && (pointsDelta !== 0 || vouchersToRemove > 0 || vouchersToRefund > 0);

      if (hasClientAdjustments) {
        await runTransaction(db, async (transaction) => {
          const verifyDoc = await transaction.get(transactionRef);
          if (!verifyDoc.exists()) throw new Error('Transaction was already deleted');

          const clientRef = doc(db, 'clients', clientId!);
          const clientDoc = await transaction.get(clientRef);
          if (!clientDoc.exists()) throw new Error('Client not found');

          const clientData = clientDoc.data() as { outletID: string; points?: number; voucherCount?: number };
          if (clientData.outletID !== outletID) throw new Error('Client does not belong to this outlet');

          const currentBalance = clientData.points || 0;
          const newBalance = Math.max(0, currentBalance + pointsDelta);
          const newVoucherCount = Math.max(0, (clientData.voucherCount ?? 0) - vouchersToRemove + vouchersToRefund);

          transaction.delete(transactionRef);

          const clientUpdates: { points?: ReturnType<typeof increment>; voucherCount?: number } = {};
          if (pointsDelta !== 0) clientUpdates.points = increment(pointsDelta);
          if (vouchersToRemove > 0 || vouchersToRefund > 0) clientUpdates.voucherCount = newVoucherCount;
          if (Object.keys(clientUpdates).length > 0) transaction.update(clientRef, clientUpdates);

          if (pointsDelta !== 0) {
            const pointTransactionsRef = collection(db, 'clients', clientId!, 'pointTransactions');
            const pointTxnRef = doc(pointTransactionsRef);
            transaction.set(pointTxnRef, {
              clientId,
              outletID,
              type: pointsDelta < 0 ? 'Deduction (Sale Deleted)' : 'Topup (Redemption Deleted)',
              amount: Math.abs(pointsDelta),
              previousBalance: currentBalance,
              newBalance,
              timestamp: new Date().toISOString(),
              isManual: false,
              description: `Receipt ${receiptNumber}`
            });
          }
        });
      } else {
        await transactionService.delete(id, outletID);
      }

      // Real-time listener will update automatically
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      setError(err.message || 'Failed to delete transaction');
      throw err;
    }
  }, [outletID, packages]);

  const handleVoidTransaction = useCallback(async (id: string) => {
    try {
      console.log('Voiding transaction:', id);
      
      // Get transaction before voiding to check if points need to be deducted
      const transactionRef = doc(db, 'transactions', id);
      const transactionDoc = await getDoc(transactionRef);
      
      if (!transactionDoc.exists()) {
        throw new Error('Transaction not found');
      }
      
      const txnData = transactionDoc.data();
      if (txnData.outletID !== outletID) {
        throw new Error('Transaction does not belong to this outlet');
      }
      
      if (txnData.status === 'voided') {
        throw new Error('Transaction is already voided');
      }

      // Same logic as delete: negative = deduct earned points; positive = refund redeemed points
      let pointsDelta = 0;
      let clientId: string | undefined;
      let vouchersToRemove = 0;
      let receiptNumber = id.replace(/\D/g, '').slice(-10) || id.slice(-8);
      receiptNumber = '#' + receiptNumber.padStart(10, '0');

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
          if (txnData.items && txnData.items.length > 0) {
            const redeemedPoints = txnData.items.reduce((sum: number, item: any) => {
              if (!item.redeemedWithPoints || !item.redeemPoints) return sum;
              return sum + (item.redeemPoints * (item.quantity ?? 1));
            }, 0);
            pointsDelta = redeemedPoints;
          }
        } else {
          if (txnData.items && txnData.items.length > 0) {
            const pointsToDeduct = txnData.items.reduce((sum: number, item: any) => {
              const itemPoints = item.points !== undefined ? item.points : Math.floor(item.price);
              return sum + (itemPoints * item.quantity);
            }, 0);
            pointsDelta = -pointsToDeduct;
            for (const item of txnData.items) {
              if (item.type !== 'package') continue;
              const pkg = packages.find((p: Package) => p.id === item.id);
              const totalServices = pkg?.services?.length ? pkg.services.reduce((s: number, ps: any) => s + (ps.quantity ?? 0), 0) : 1;
              vouchersToRemove += (item.quantity ?? 1) * Math.max(1, totalServices);
            }
          } else {
            const pointsToDeduct = Math.floor(txnData.amount);
            pointsDelta = -pointsToDeduct;
          }
        }
      }

      const hasClientAdjustments = clientId && (pointsDelta !== 0 || vouchersToRemove > 0 || vouchersToRefund > 0);

      if (hasClientAdjustments) {
        await runTransaction(db, async (transaction) => {
          const verifyDoc = await transaction.get(transactionRef);
          if (!verifyDoc.exists()) throw new Error('Transaction was already deleted');
          if (verifyDoc.data().status === 'voided') throw new Error('Transaction is already voided');

          const clientRef = doc(db, 'clients', clientId!);
          const clientDoc = await transaction.get(clientRef);
          if (!clientDoc.exists()) throw new Error('Client not found');

          const clientData = clientDoc.data() as { outletID: string; points?: number; voucherCount?: number };
          if (clientData.outletID !== outletID) throw new Error('Client does not belong to this outlet');

          const currentBalance = clientData.points || 0;
          const newBalance = Math.max(0, currentBalance + pointsDelta);
          const newVoucherCount = Math.max(0, (clientData.voucherCount ?? 0) - vouchersToRemove + vouchersToRefund);

          transaction.update(transactionRef, { status: 'voided' });

          const clientUpdates: { points?: ReturnType<typeof increment>; voucherCount?: number } = {};
          if (pointsDelta !== 0) clientUpdates.points = increment(pointsDelta);
          if (vouchersToRemove > 0 || vouchersToRefund > 0) clientUpdates.voucherCount = newVoucherCount;
          if (Object.keys(clientUpdates).length > 0) transaction.update(clientRef, clientUpdates);

          if (pointsDelta !== 0) {
            const pointTransactionsRef = collection(db, 'clients', clientId!, 'pointTransactions');
            const pointTxnRef = doc(pointTransactionsRef);
            transaction.set(pointTxnRef, {
              clientId,
              outletID,
              type: pointsDelta < 0 ? 'Deduction (Sale Deleted)' : 'Topup (Sale Voided)',
              amount: Math.abs(pointsDelta),
              previousBalance: currentBalance,
              newBalance,
              timestamp: new Date().toISOString(),
              isManual: false,
              description: `Receipt ${receiptNumber} - Voided`
            });
          }
        });
      } else {
        await transactionService.update(id, { status: 'voided' }, outletID);
      }

      // Remove linked appointments from the calendar when sale is voided (same as on delete).
      // This keeps the appointment page in sync: voided sale → appointment disappears.
      const appointmentsRef = collection(db, 'appointments');
      const bySaleId = query(appointmentsRef, where('saleId', '==', id));
      const bySourceSaleId = query(appointmentsRef, where('sourceSaleId', '==', id));
      const [snapSaleId, snapSourceSaleId] = await Promise.all([getDocs(bySaleId), getDocs(bySourceSaleId)]);
      const toDelete = new Set<string>();
      snapSaleId.docs.forEach((d) => toDelete.add(d.id));
      snapSourceSaleId.docs.forEach((d) => toDelete.add(d.id));
      for (const docId of toDelete) {
        await deleteDoc(doc(db, 'appointments', docId));
      }
      if (toDelete.size > 0) {
        console.log('Deleted', toDelete.size, 'appointment(s) linked to voided sale', id);
      }

      // Delete linked commission transaction(s) when sale is voided (same as on delete)
      const transactionsRef = collection(db, 'transactions');
      const commissionsQuery = query(
        transactionsRef,
        where('outletID', '==', outletID),
        where('parentSaleId', '==', id),
        where('category', '==', 'Commission')
      );
      const commissionsSnap = await getDocs(commissionsQuery);
      for (const commissionDoc of commissionsSnap.docs) {
        await deleteDoc(doc(db, 'transactions', commissionDoc.id));
      }
      if (commissionsSnap.docs.length > 0) {
        console.log('Deleted', commissionsSnap.docs.length, 'commission transaction(s) linked to voided sale', id);
      }

      // Real-time listener will update automatically
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
      // This is a batch update - you might want to implement a batch service
      // For now, we'll update individually
      const currentRewards = await rewardService.getAll(outletID);
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
  }, [outletID]);

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
