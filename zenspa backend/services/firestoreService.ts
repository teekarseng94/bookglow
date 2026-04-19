/**
 * Firestore Service Layer
 * 
 * This service handles all CRUD operations for the multi-tenant SPA Manager.
 * All operations are scoped by outletID for data isolation.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  runTransaction,
  increment,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  serverTimestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Client,
  Staff,
  Appointment,
  Transaction,
  Service,
  Product,
  Package,
  Reward,
  Outlet,
  ApiIntegration,
  TransactionType
} from '../types';

// Current outlet ID — set by useFirestoreData from the logged-in user's Firestore document (users/{uid}.outletId).
// No default: multi-tenant isolation requires every user to have a users doc with outletId.
let currentOutletID = '';

export const setCurrentOutletID = (outletID: string) => {
  currentOutletID = outletID || '';
};

export const getCurrentOutletID = () => currentOutletID;

/** Multi-tenant: must have a valid outlet from users/{uid}.outletId. Returns true if safe to query. */
function hasValidOutlet(outletID: string | undefined): boolean {
  return outletID != null && String(outletID).trim().length > 0;
}

/** Remove undefined values from an object (and nested objects). Firestore rejects undefined. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const v = (obj as Record<string, unknown>)[key];
    if (v === undefined) continue;
    out[key] =
      v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)
        ? stripUndefined(v as Record<string, unknown>)
        : v;
  }
  return out as T;
}

/**
 * ============================================
 * CLIENT OPERATIONS
 * ============================================
 */

export const clientService = {
  // Get all clients for current outlet
  getAll: async (outletID: string = currentOutletID): Promise<Client[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const q = query(
      collection(db, 'clients'),
      where('outletID', '==', outletID),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Client));
  },

  // Get client by ID
  getById: async (clientId: string, outletID: string = currentOutletID): Promise<Client | null> => {
    if (!hasValidOutlet(outletID)) return null;
    const q = query(
      collection(db, 'clients'),
      where('outletID', '==', outletID),
      where('__name__', '==', clientId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Client;
  },

  // Add new client (points optional for import; default 0)
  add: async (client: Omit<Client, 'id' | 'points'> & { points?: number }, outletID: string = currentOutletID): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const initialPoints = typeof client.points === 'number' && client.points >= 0 ? client.points : 0;
    const raw = {
      ...client,
      outletID,
      points: initialPoints,
      credit: 0,
      voucherCount: 0,
      outstanding: 0,
      // If a join date (createdAt) was provided from the UI, use it; otherwise fall back to server timestamp
      createdAt: (client as any).createdAt ?? serverTimestamp()
    };
    // Firestore does not accept undefined; strip undefined values so addDoc() does not throw
    const clientData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (value !== undefined) clientData[key] = value;
    }
    const docRef = await addDoc(collection(db, 'clients'), clientData);
    return docRef.id;
  },

  // Update client
  update: async (clientId: string, updates: Partial<Client>, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const clientRef = doc(db, 'clients', clientId);
    const clientDoc = await getDoc(clientRef);
    
    if (!clientDoc.exists()) {
      throw new Error('Client not found');
    }
    
    const clientData = clientDoc.data();
    if (clientData.outletID !== outletID) {
      throw new Error('Client does not belong to this outlet');
    }
    
    await updateDoc(clientRef, updates);
  },

  /** Increment client voucher count (e.g. +1 per package purchased). Uses Firestore increment(). */
  incrementVoucherCount: async (clientId: string, delta: number, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    if (delta <= 0) return;
    const clientRef = doc(db, 'clients', clientId);
    const clientDoc = await getDoc(clientRef);
    if (!clientDoc.exists()) throw new Error('Client not found');
    const clientData = clientDoc.data();
    if (clientData.outletID !== outletID) throw new Error('Client does not belong to this outlet');
    await updateDoc(clientRef, { voucherCount: increment(delta) });
  },

  /** Redeem one voucher for the member (decrements voucherCount, min 0). */
  redeemVoucher: async (clientId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required.');
    const clientRef = doc(db, 'clients', clientId);
    const clientDoc = await getDoc(clientRef);
    if (!clientDoc.exists()) throw new Error('Client not found');
    const clientData = clientDoc.data();
    if (clientData.outletID !== outletID) throw new Error('Client does not belong to this outlet');
    const current = Number(clientData.voucherCount ?? 0);
    if (current < 1) throw new Error('Member has no vouchers to redeem.');
    await updateDoc(clientRef, { voucherCount: current - 1 });
  },

  /** Decrement member voucher count by amount (e.g. when a package sale is deleted or voided). Min 0. */
  decrementVoucherCount: async (clientId: string, amount: number, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required.');
    if (amount <= 0) return;
    const clientRef = doc(db, 'clients', clientId);
    const clientDoc = await getDoc(clientRef);
    if (!clientDoc.exists()) throw new Error('Client not found');
    const clientData = clientDoc.data();
    if (clientData.outletID !== outletID) throw new Error('Client does not belong to this outlet');
    const current = Number(clientData.voucherCount ?? 0);
    await updateDoc(clientRef, { voucherCount: Math.max(0, current - amount) });
  },

  // Update client points (used for manual CRM edits; uses atomic increment)
  updatePoints: async (clientId: string, pointsChange: number, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const clientRef = doc(db, 'clients', clientId);
    const clientDoc = await getDoc(clientRef);

    if (!clientDoc.exists()) {
      throw new Error('Client not found');
    }

    const clientData = clientDoc.data();
    if (clientData.outletID !== outletID) {
      throw new Error('Client does not belong to this outlet');
    }

    await updateDoc(clientRef, { points: increment(pointsChange) });
  },

  /**
   * Add loyalty points for a specific sale. Idempotent: if points for this saleId were already
   * credited (recorded in clients/{clientId}/points_credits/{saleId}), this is a no-op.
   * Uses Firestore increment() for safe server-side math.
   */
  updatePointsForSale: async (
    clientId: string,
    pointsToAdd: number,
    saleId: string,
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required.');
    if (pointsToAdd <= 0) return;

    const clientRef = doc(db, 'clients', clientId);
    const creditLogRef = doc(db, 'clients', clientId, 'points_credits', saleId);

    await runTransaction(db, async (transaction) => {
      const clientDoc = await transaction.get(clientRef);
      if (!clientDoc.exists()) throw new Error('Client not found');
      const clientData = clientDoc.data();
      if (clientData.outletID !== outletID) throw new Error('Client does not belong to this outlet');

      const alreadyCredited = await transaction.get(creditLogRef);
      if (alreadyCredited.exists()) {
        console.log('Points for saleId already credited, skipping:', saleId, 'client:', clientId);
        return;
      }

      transaction.update(clientRef, { points: increment(pointsToAdd) });
      transaction.set(creditLogRef, {
        saleId,
        points: pointsToAdd,
        creditedAt: serverTimestamp()
      });
    });
  },

  // Delete client
  delete: async (clientId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const clientRef = doc(db, 'clients', clientId);
    const clientDoc = await getDoc(clientRef);
    
    if (!clientDoc.exists()) {
      throw new Error('Client not found');
    }
    
    const clientData = clientDoc.data();
    if (clientData.outletID !== outletID) {
      throw new Error('Client does not belong to this outlet');
    }
    
    await deleteDoc(clientRef);
  },

  /** Delete all clients in this outlet that have the given lastImportId (undo import batch). */
  deleteByLastImportId: async (sessionId: string, outletID: string = currentOutletID): Promise<number> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required.');
    const q = query(
      collection(db, 'clients'),
      where('outletID', '==', outletID),
      where('lastImportId', '==', sessionId)
    );
    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, 'clients', d.id));
    }
    return snapshot.size;
  },

  /** Delete all clients in this outlet. Returns count deleted. */
  deleteAll: async (outletID: string = currentOutletID): Promise<number> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required.');
    const q = query(
      collection(db, 'clients'),
      where('outletID', '==', outletID)
    );
    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, 'clients', d.id));
    }
    return snapshot.size;
  }
};


/**
 * ============================================
 * STAFF OPERATIONS
 * ============================================
 */

export const staffService = {
  // Get all staff for current outlet
  getAll: async (outletID: string = currentOutletID): Promise<Staff[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const q = query(
      collection(db, 'staff'),
      where('outletID', '==', outletID),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Staff));
  },

  // Add new staff
  add: async (staff: Omit<Staff, 'id'>, outletID: string = currentOutletID): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const staffData = {
      ...staff,
      outletID,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'staff'), staffData);
    return docRef.id;
  },

  // Update staff
  update: async (staffId: string, updates: Partial<Staff>, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const staffRef = doc(db, 'staff', staffId);
    const staffDoc = await getDoc(staffRef);
    
    if (!staffDoc.exists()) {
      throw new Error('Staff not found');
    }
    
    const staffData = staffDoc.data();
    if (staffData.outletID !== outletID) {
      throw new Error('Staff does not belong to this outlet');
    }
    
    await updateDoc(staffRef, updates);
  },

  // Delete staff
  delete: async (staffId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const staffRef = doc(db, 'staff', staffId);
    const staffDoc = await getDoc(staffRef);
    
    if (!staffDoc.exists()) {
      throw new Error('Staff not found');
    }
    
    const staffData = staffDoc.data();
    if (staffData.outletID !== outletID) {
      throw new Error('Staff does not belong to this outlet');
    }
    
    await deleteDoc(staffRef);
  }
};

/**
 * ============================================
 * APPOINTMENT OPERATIONS
 * ============================================
 */

export const appointmentService = {
  // Get all appointments for current outlet
  getAll: async (outletID: string = currentOutletID): Promise<Appointment[]> => {
    const q = query(
      collection(db, 'appointments'),
      where('outletID', '==', outletID),
      orderBy('date', 'desc'),
      orderBy('time', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Appointment));
  },

  // Get daily appointments
  getDaily: async (date: string, outletID: string = currentOutletID): Promise<Appointment[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const q = query(
      collection(db, 'appointments'),
      where('outletID', '==', outletID),
      where('date', '==', date),
      orderBy('time', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Appointment));
  },

  // Get staff schedule
  getStaffSchedule: async (staffId: string, date: string, outletID: string = currentOutletID): Promise<Appointment[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const q = query(
      collection(db, 'appointments'),
      where('outletID', '==', outletID),
      where('staffId', '==', staffId),
      where('date', '==', date),
      orderBy('time', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Appointment));
  },

  // Add new appointment (Firestore assigns doc id; do not store client id in doc so listener uses doc.id)
  add: async (appointment: Omit<Appointment, 'id'> | Appointment, outletID: string = currentOutletID): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const { id: _omit, ...rest } = appointment as Appointment;
    const appointmentData = { ...rest, outletID };
    const docRef = await addDoc(collection(db, 'appointments'), appointmentData);
    return docRef.id;
  },

  /** Upsert appointment by custom ID (e.g. Setmore UID). Used for ICS sync deduplication. */
  setWithId: async (appointmentId: string, appointment: Omit<Appointment, 'id'>, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const appointmentRef = doc(db, 'appointments', appointmentId);
    await setDoc(appointmentRef, {
      ...appointment,
      outletID
    }, { merge: true });
  },

  // Update appointment
  update: async (appointmentId: string, updates: Partial<Appointment>, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);
    
    if (!appointmentDoc.exists()) {
      // Appointment may have been deleted (e.g., when sale was voided/deleted)
      // Log warning but don't throw error - this is expected behavior
      console.warn(`Appointment ${appointmentId} not found - may have been deleted. Skipping update.`);
      return; // Silently return instead of throwing error
    }
    
    const appointmentData = appointmentDoc.data();
    if (appointmentData.outletID !== outletID) {
      throw new Error('Appointment does not belong to this outlet');
    }
    
    await updateDoc(appointmentRef, updates);
  },

  // Update appointment status
  updateStatus: async (appointmentId: string, status: Appointment['status'], outletID: string = currentOutletID): Promise<void> => {
    await appointmentService.update(appointmentId, { status }, outletID);
  },

  // Delete appointment
  delete: async (appointmentId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);
    
    if (!appointmentDoc.exists()) {
      // Appointment may have been deleted (e.g., when sale was voided/deleted)
      // Silently return - this is expected behavior, no need to log warning
      return;
    }
    
    const appointmentData = appointmentDoc.data();
    if (appointmentData.outletID !== outletID) {
      throw new Error('Appointment does not belong to this outlet');
    }
    
    await deleteDoc(appointmentRef);
  }
};

/**
 * ============================================
 * TRANSACTION OPERATIONS
 * ============================================
 */

export const transactionService = {
  // Get all transactions for current outlet
  getAll: async (outletID: string = currentOutletID): Promise<Transaction[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const q = query(
      collection(db, 'transactions'),
      where('outletID', '==', outletID),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date
      } as Transaction;
    });
  },

  // Get daily sales
  getDailySales: async (date: string, outletID: string = currentOutletID): Promise<Transaction[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const q = query(
      collection(db, 'transactions'),
      where('outletID', '==', outletID),
      where('type', '==', TransactionType.SALE),
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date
      } as Transaction;
    });
  },

  // Add new transaction — saves to Firestore under the given outletID so it persists and appears on refresh
  add: async (transaction: Omit<Transaction, 'id'>, outletID: string = currentOutletID): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const dateValue = transaction.date ? new Date(transaction.date) : null;
    const validDate = dateValue && !isNaN(dateValue.getTime()) ? dateValue : new Date();
    // Sanitize items: Firestore rejects undefined. Strip undefined from each CartItem (e.g. package items have no staffId/commissionEarned).
    const sanitizedItems =
      transaction.items != null && transaction.items.length > 0
        ? transaction.items.map((item) => stripUndefined({ ...item } as Record<string, unknown>) as Record<string, unknown>)
        : undefined;
    const transactionData: Record<string, unknown> = {
      outletID: String(outletID).trim(),
      type: transaction.type,
      amount: Number(transaction.amount),
      category: transaction.category ?? '',
      description: transaction.description ?? '',
      date: Timestamp.fromDate(validDate),
      ...(transaction.clientId != null && { clientId: transaction.clientId }),
      ...(sanitizedItems != null && sanitizedItems.length > 0 && { items: sanitizedItems }),
      ...(transaction.paymentMethod != null && { paymentMethod: transaction.paymentMethod }),
      ...(transaction.parentSaleId != null && { parentSaleId: transaction.parentSaleId })
    };
    const docRef = await addDoc(collection(db, 'transactions'), transactionData);
    return docRef.id;
  },

  // Update transaction
  update: async (transactionId: string, updates: Partial<Transaction>, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const transactionRef = doc(db, 'transactions', transactionId);
    const transactionDoc = await getDoc(transactionRef);
    
    if (!transactionDoc.exists()) {
      throw new Error('Transaction not found');
    }
    
    const transactionData = transactionDoc.data();
    if (transactionData.outletID !== outletID) {
      throw new Error('Transaction does not belong to this outlet');
    }
    
    const updateData: any = { ...updates };
    if (updates.date) {
      updateData.date = Timestamp.fromDate(new Date(updates.date));
    }
    
    await updateDoc(transactionRef, updateData);
  },

  // Delete transaction
  delete: async (transactionId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const transactionRef = doc(db, 'transactions', transactionId);
    const transactionDoc = await getDoc(transactionRef);
    
    if (!transactionDoc.exists()) {
      throw new Error('Transaction not found');
    }
    
    const transactionData = transactionDoc.data();
    if (transactionData.outletID !== outletID) {
      throw new Error('Transaction does not belong to this outlet');
    }
    
    await deleteDoc(transactionRef);
  }
};

/**
 * ============================================
 * SERVICE OPERATIONS
 * ============================================
 */

export const serviceService = {
  // Get all services for current outlet
  getAll: async (outletID: string = currentOutletID): Promise<Service[]> => {
    if (!hasValidOutlet(outletID)) return [];
    // Simple query without composite index requirements; sort in memory by displayOrder then name
    const q = query(
      collection(db, 'services'),
      where('outletID', '==', outletID)
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Service));
    return list.sort((a, b) => {
      const aOrder = (a as any).displayOrder ?? 0;
      const bOrder = (b as any).displayOrder ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (a.name || '').localeCompare(b.name || '');
    });
  },

  // Add new service (strip undefined — Firestore does not allow undefined)
  add: async (service: Omit<Service, 'id'>, outletID: string = currentOutletID): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const serviceData: Record<string, unknown> = {
      outletID,
      createdAt: serverTimestamp()
    };
    for (const [key, value] of Object.entries(service)) {
      if (value !== undefined) {
        serviceData[key] = value;
      }
    }
    const docRef = await addDoc(collection(db, 'services'), serviceData);
    return docRef.id;
  },

  // Update service (strips undefined values — Firestore does not allow undefined)
  update: async (serviceId: string, updates: Partial<Service>, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const serviceRef = doc(db, 'services', serviceId);
    const serviceDoc = await getDoc(serviceRef);

    if (!serviceDoc.exists()) {
      throw new Error('Service not found');
    }

    const serviceData = serviceDoc.data();
    if (serviceData.outletID !== outletID) {
      throw new Error('Service does not belong to this outlet');
    }

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    await updateDoc(serviceRef, cleanUpdates);
  },

  // Delete service
  delete: async (serviceId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    
    // First, try direct document access
    const serviceRef = doc(db, 'services', serviceId);
    const serviceDoc = await getDoc(serviceRef);
    
    if (serviceDoc.exists()) {
      // Document found by direct ID - verify outlet ownership and delete
      const serviceData = serviceDoc.data();
      if (serviceData.outletID !== outletID) {
        throw new Error('Service does not belong to this outlet');
      }
      await deleteDoc(serviceRef);
      return;
    }
    
    // If direct lookup failed, try querying by outletID and the service's name/id field
    // This handles cases where the ID might be a custom ID that doesn't match the document ID
    const servicesQuery = query(
      collection(db, 'services'),
      where('outletID', '==', outletID)
    );
    const snapshot = await getDocs(servicesQuery);
    
    // Try to find the service by matching the ID field in the document data
    const matchingDoc = snapshot.docs.find(doc => {
      const data = doc.data();
      // Check if the document's id field matches, or if the document ID itself matches
      return doc.id === serviceId || data.id === serviceId;
    });
    
    if (matchingDoc) {
      // Found by query - delete it
      await deleteDoc(matchingDoc.ref);
      return;
    }
    
    // Service not found
    throw new Error(`Service not found with ID: ${serviceId}`);
  },

  /** Update category name for all services in this outlet (when a menu category is renamed). */
  updateCategoryName: async (outletID: string, oldName: string, newName: string): Promise<void> => {
    if (!hasValidOutlet(outletID)) return;
    const q = query(
      collection(db, 'services'),
      where('outletID', '==', outletID),
      where('category', '==', oldName)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.update(d.ref, { category: newName }));
    await batch.commit();
  },

  /** Batch update displayOrder for services when rows are re-ordered in the Menu page. */
  updateDisplayOrder: async (
    updates: { id: string; displayOrder: number }[],
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required.');
    if (!updates.length) return;
    const batch = writeBatch(db);
    updates.forEach(({ id, displayOrder }) => {
      const ref = doc(db, 'services', id);
      batch.update(ref, { displayOrder });
    });
    await batch.commit();
  }
};

/**
 * ============================================
 * PRODUCT OPERATIONS
 * ============================================
 */

export const productService = {
  // Get all products for current outlet
  getAll: async (outletID: string = currentOutletID): Promise<Product[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const q = query(
      collection(db, 'products'),
      where('outletID', '==', outletID),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Product));
  },

  // Add new product
  add: async (product: Omit<Product, 'id'>, outletID: string = currentOutletID): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const productData = {
      ...product,
      outletID
    };
    const docRef = await addDoc(collection(db, 'products'), productData);
    return docRef.id;
  },

  // Update product
  update: async (productId: string, updates: Partial<Product>, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const productRef = doc(db, 'products', productId);
    const productDoc = await getDoc(productRef);
    
    if (!productDoc.exists()) {
      throw new Error('Product not found');
    }
    
    const productData = productDoc.data();
    if (productData.outletID !== outletID) {
      throw new Error('Product does not belong to this outlet');
    }
    
    await updateDoc(productRef, updates);
  },

  // Delete product
  delete: async (productId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    
    // First, try direct document access
    const productRef = doc(db, 'products', productId);
    const productDoc = await getDoc(productRef);
    
    if (productDoc.exists()) {
      // Document found by direct ID - verify outlet ownership and delete
      const productData = productDoc.data();
      if (productData.outletID !== outletID) {
        throw new Error('Product does not belong to this outlet');
      }
      await deleteDoc(productRef);
      return;
    }
    
    // If direct lookup failed, try querying by outletID
    const productsQuery = query(
      collection(db, 'products'),
      where('outletID', '==', outletID)
    );
    const snapshot = await getDocs(productsQuery);
    
    // Try to find the product by matching the ID field in the document data
    const matchingDoc = snapshot.docs.find(doc => {
      const data = doc.data();
      return doc.id === productId || data.id === productId;
    });
    
    if (matchingDoc) {
      await deleteDoc(matchingDoc.ref);
      return;
    }
    
    throw new Error(`Product not found with ID: ${productId}`);
  },

  /** Update category name for all products in this outlet (when a menu category is renamed). */
  updateCategoryName: async (outletID: string, oldName: string, newName: string): Promise<void> => {
    if (!hasValidOutlet(outletID)) return;
    const q = query(
      collection(db, 'products'),
      where('outletID', '==', outletID),
      where('category', '==', oldName)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.update(d.ref, { category: newName }));
    await batch.commit();
  }
};

/**
 * ============================================
 * PACKAGE OPERATIONS
 * ============================================
 */

export const packageService = {
  // Get all packages for current outlet
  getAll: async (outletID: string = currentOutletID): Promise<Package[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const q = query(
      collection(db, 'packages'),
      where('outletID', '==', outletID),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Package));
  },

  // Add new package
  add: async (pkg: Omit<Package, 'id'>, outletID: string = currentOutletID): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const packageData = {
      ...pkg,
      outletID,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'packages'), packageData);
    return docRef.id;
  },

  // Update package
  update: async (packageId: string, updates: Partial<Package>, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const packageRef = doc(db, 'packages', packageId);
    const packageDoc = await getDoc(packageRef);
    
    if (!packageDoc.exists()) {
      throw new Error('Package not found');
    }
    
    const packageData = packageDoc.data();
    if (packageData.outletID !== outletID) {
      throw new Error('Package does not belong to this outlet');
    }
    
    await updateDoc(packageRef, updates);
  },

  // Delete package
  delete: async (packageId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    
    // First, try direct document access
    const packageRef = doc(db, 'packages', packageId);
    const packageDoc = await getDoc(packageRef);
    
    if (packageDoc.exists()) {
      // Document found by direct ID - verify outlet ownership and delete
      const packageData = packageDoc.data();
      if (packageData.outletID !== outletID) {
        throw new Error('Package does not belong to this outlet');
      }
      await deleteDoc(packageRef);
      return;
    }
    
    // If direct lookup failed, try querying by outletID
    const packagesQuery = query(
      collection(db, 'packages'),
      where('outletID', '==', outletID)
    );
    const snapshot = await getDocs(packagesQuery);
    
    // Try to find the package by matching the ID field in the document data
    const matchingDoc = snapshot.docs.find(doc => {
      const data = doc.data();
      return doc.id === packageId || data.id === packageId;
    });
    
    if (matchingDoc) {
      await deleteDoc(matchingDoc.ref);
      return;
    }
    
    throw new Error(`Package not found with ID: ${packageId}`);
  },

  /** Update category name for all packages in this outlet (when a menu category is renamed). */
  updateCategoryName: async (outletID: string, oldName: string, newName: string): Promise<void> => {
    if (!hasValidOutlet(outletID)) return;
    const q = query(
      collection(db, 'packages'),
      where('outletID', '==', outletID),
      where('category', '==', oldName)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.update(d.ref, { category: newName }));
    await batch.commit();
  }
};

/**
 * ============================================
 * REWARD OPERATIONS
 * ============================================
 */

export const rewardService = {
  // Get all rewards for current outlet
  // Note: Sorting by 'cost' is done in memory to avoid requiring a composite index
  getAll: async (outletID: string = currentOutletID): Promise<Reward[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const q = query(
      collection(db, 'rewards'),
      where('outletID', '==', outletID)
      // Removed orderBy to avoid requiring composite index (outletID + cost)
      // We'll sort in memory instead
    );
    const snapshot = await getDocs(q);
    const rewards = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Reward));
    
    // Sort by cost in ascending order
    return rewards.sort((a, b) => a.cost - b.cost);
  },

  // Add new reward
  add: async (reward: Omit<Reward, 'id'>, outletID: string = currentOutletID): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const rewardData = {
      ...reward,
      outletID
    };
    const docRef = await addDoc(collection(db, 'rewards'), rewardData);
    return docRef.id;
  },

  // Update reward
  update: async (rewardId: string, updates: Partial<Reward>, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const rewardRef = doc(db, 'rewards', rewardId);
    const rewardDoc = await getDoc(rewardRef);
    
    if (!rewardDoc.exists()) {
      throw new Error('Reward not found');
    }
    
    const rewardData = rewardDoc.data();
    if (rewardData.outletID !== outletID) {
      throw new Error('Reward does not belong to this outlet');
    }
    
    await updateDoc(rewardRef, updates);
  },

  // Delete reward
  delete: async (rewardId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required (user must be mapped to an outlet in users collection).');
    const rewardRef = doc(db, 'rewards', rewardId);
    const rewardDoc = await getDoc(rewardRef);
    
    if (!rewardDoc.exists()) {
      throw new Error('Reward not found');
    }
    
    const rewardData = rewardDoc.data();
    if (rewardData.outletID !== outletID) {
      throw new Error('Reward does not belong to this outlet');
    }
    
    await deleteDoc(rewardRef);
  }
};

/**
 * ============================================
 * OUTLET OPERATIONS
 * ============================================
 */

export const outletService = {
  // Get outlet by ID
  getById: async (outletID: string): Promise<Outlet | null> => {
    const outletRef = doc(db, 'outlets', outletID);
    const outletDoc = await getDoc(outletRef);
    
    if (!outletDoc.exists()) {
      return null;
    }
    
    return { outletID: outletDoc.id, ...outletDoc.data() } as Outlet;
  },

  /** Find outlet by public booking slug (outlets.bookingSlug). */
  getByBookingSlug: async (slug: string): Promise<Outlet | null> => {
    const s = (slug || '').trim();
    if (!s) return null;
    const q = query(collection(db, 'outlets'), where('bookingSlug', '==', s), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { outletID: d.id, ...d.data() } as Outlet;
  },

  // Get all outlets
  getAll: async (): Promise<Outlet[]> => {
    const snapshot = await getDocs(collection(db, 'outlets'));
    return snapshot.docs.map(doc => ({
      outletID: doc.id,
      ...doc.data()
    } as Outlet));
  },

  // Add new outlet
  add: async (outlet: Omit<Outlet, 'outletID'>): Promise<string> => {
    const outletData = {
      ...outlet,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'outlets'), outletData);
    return docRef.id;
  },

  // Update outlet (creates document if missing; strips undefined so Firestore accepts the write)
  update: async (outletID: string, updates: Partial<Outlet>): Promise<void> => {
    const outletRef = doc(db, 'outlets', outletID);
    const cleaned = stripUndefined(updates as Record<string, unknown>) as Partial<Outlet>;
    await setDoc(
      outletRef,
      { ...cleaned, updatedAt: serverTimestamp() },
      { merge: true }
    );
  },

  /** Get service/menu categories for an outlet (persisted in outlet doc). */
  getServiceCategories: async (outletID: string): Promise<string[]> => {
    const outlet = await outletService.getById(outletID);
    const list = outlet?.serviceCategories;
    return Array.isArray(list) ? [...list] : [];
  },

  /** Replace service categories (add/rename/delete) and persist to Firestore. */
  updateServiceCategories: async (outletID: string, categories: string[]): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required.');
    await outletService.update(outletID, { serviceCategories: categories });
  }
};

/**
 * ============================================
 * API INTEGRATION (Chatbot / mychatbot.website)
 * ============================================
 * One doc per outlet: apiIntegrations/{outletID}.
 * Stores apiKeyHash (SHA-256), keyPrefix (display), webhookUrl.
 */

export const apiIntegrationService = {
  get: async (outletID: string = currentOutletID): Promise<ApiIntegration | null> => {
    if (!hasValidOutlet(outletID)) return null;
    const ref = doc(db, 'apiIntegrations', outletID);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { outletID: snap.id, ...snap.data() } as ApiIntegration;
  },

  /** Save API key (hash + prefix). Caller hashes the key before calling. Preserves existing webhookUrl. */
  setApiKey: async (
    outletID: string,
    apiKeyHash: string,
    keyPrefix: string,
    effectiveOutletID: string = currentOutletID
  ): Promise<void> => {
    const id = effectiveOutletID || outletID;
    if (!hasValidOutlet(id)) throw new Error('outletID is required.');
    const ref = doc(db, 'apiIntegrations', id);
    const existing = await getDoc(ref);
    const existingData = existing.exists() ? existing.data() : {};
    await setDoc(
      ref,
      {
        outletID: id,
        ...existingData,
        apiKeyHash,
        keyPrefix,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  },

  setWebhookUrl: async (
    outletID: string,
    webhookUrl: string,
    effectiveOutletID: string = currentOutletID
  ): Promise<void> => {
    const id = effectiveOutletID || outletID;
    if (!hasValidOutlet(id)) throw new Error('outletID is required.');
    const ref = doc(db, 'apiIntegrations', id);
    const existing = await getDoc(ref);
    const existingData = existing.exists() ? existing.data() : {};
    await setDoc(
      ref,
      {
        outletID: id,
        ...existingData,
        webhookUrl: webhookUrl.trim() || null,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }
};
