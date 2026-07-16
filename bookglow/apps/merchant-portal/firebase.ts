/**
 * Firebase/Firestore Configuration for Multi-Tenant SPA Manager
 * 
 * This file sets up Firestore collections with multi-outlet support.
 * All queries are scoped by outletID to ensure data isolation.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  CollectionReference,
  query,
  where,
  QueryConstraint,
  Timestamp
} from 'firebase/firestore';
import { Outlet, Staff, Client, Appointment, Transaction, Service, Product, Package, Reward } from './types';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDZ2mARLr07WyhCcKGljEZZi7S6nvBdpbQ",
  authDomain: "bookglow-83fb3.firebaseapp.com",
  projectId: "bookglow-83fb3",
  storageBucket: "bookglow-83fb3.firebasestorage.app",
  messagingSenderId: "27124152215",
  appId: "1:27124152215:web:669828b79c302697c136d2",
  measurementId: "G-R25VJZ4TSE"
};

// Initialize Firebase
export let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0] as FirebaseApp;
}

// Initialize Firestore
export const db: Firestore = getFirestore(app);

// Initialize Authentication
export const auth: Auth = getAuth(app);

// Initialize Storage
export const storage: FirebaseStorage = getStorage(app);

// Initialize Analytics (only in browser environment)
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Analytics initialization failed:', error);
  }
}

/**
 * Collection References
 * These are typed collection references for each Firestore collection
 */
export const outletsCol = collection(db, 'outlets') as CollectionReference<Outlet>;
export const staffCol = collection(db, 'staff') as CollectionReference<Staff>;
export const clientsCol = collection(db, 'clients') as CollectionReference<Client>;
export const appointmentsCol = collection(db, 'appointments') as CollectionReference<Appointment>;
export const transactionsCol = collection(db, 'transactions') as CollectionReference<Transaction>;
export const servicesCol = collection(db, 'services') as CollectionReference<Service>;
export const productsCol = collection(db, 'products') as CollectionReference<Product>;
export const packagesCol = collection(db, 'packages') as CollectionReference<Package>;
export const rewardsCol = collection(db, 'rewards') as CollectionReference<Reward>;

/**
 * Helper function to create outlet-scoped queries
 * All queries should include outletID filter for data isolation
 */
export function createOutletQuery<T>(
  collectionRef: CollectionReference<T>,
  outletID: string,
  additionalConstraints: QueryConstraint[] = []
): ReturnType<typeof query> {
  return query(
    collectionRef,
    where('outletID', '==', outletID),
    ...additionalConstraints
  );
}

/**
 * Common query builders for multi-tenant operations
 */
export const OutletQueries = {
  /**
   * Get all staff for a specific outlet
   */
  getOutletStaff: (outletID: string) => 
    createOutletQuery(staffCol, outletID),

  /**
   * Get daily appointments for an outlet
   */
  getDailyAppointments: (outletID: string, date: string) =>
    createOutletQuery(
      appointmentsCol,
      outletID,
      [where('date', '==', date)]
    ),

  /**
   * Get staff schedule for a specific day
   */
  getStaffSchedule: (outletID: string, staffId: string, date: string) =>
    createOutletQuery(
      appointmentsCol,
      outletID,
      [
        where('staffId', '==', staffId),
        where('date', '==', date)
      ]
    ),

  /**
   * Get daily sales (transactions) for an outlet
   */
  getDailySales: (outletID: string, date: string) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return createOutletQuery(
      transactionsCol,
      outletID,
      [
        where('type', '==', 'SALE'),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      ]
    );
  },

  /**
   * Get all clients for an outlet
   */
  getOutletClients: (outletID: string) =>
    createOutletQuery(clientsCol, outletID),

  /**
   * Get client's appointment history
   */
  getClientAppointments: (outletID: string, clientId: string) =>
    createOutletQuery(
      appointmentsCol,
      outletID,
      [where('clientId', '==', clientId)]
    ),

  /**
   * Get client's transaction history
   */
  getClientTransactions: (outletID: string, clientId: string) =>
    createOutletQuery(
      transactionsCol,
      outletID,
      [where('clientId', '==', clientId)]
    ),

  /**
   * Get services by category for an outlet
   */
  getServicesByCategory: (outletID: string, category: string) =>
    createOutletQuery(
      servicesCol,
      outletID,
      [where('category', '==', category)]
    ),

  /**
   * Get all appointments for an outlet filtered by status
   */
  getAppointmentsByStatus: (outletID: string, status: Appointment['status']) =>
    createOutletQuery(
      appointmentsCol,
      outletID,
      [where('status', '==', status)]
    ),

  /**
   * Get transactions by type for an outlet
   */
  getTransactionsByType: (outletID: string, type: Transaction['type']) =>
    createOutletQuery(
      transactionsCol,
      outletID,
      [where('type', '==', type)]
    )
};

/**
 * Utility function to ensure all documents include outletID
 * Use this when creating new documents to enforce multi-tenant structure
 */
export function ensureOutletID<T extends { outletID: string }>(
  data: Partial<T>,
  outletID: string
): T {
  if (!outletID) {
    throw new Error('outletID is required for multi-tenant data isolation');
  }
  return { ...data, outletID } as T;
}

export default db;
