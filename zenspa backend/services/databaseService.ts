/**
 * Database Service Provider Switch
 *
 * Routes all database calls to either Firestore or Supabase
 * based on VITE_DB_PROVIDER environment variable.
 *
 * Usage: import from this file instead of firestoreService or supabaseService.
 * Set VITE_DB_PROVIDER=firestore (default) or VITE_DB_PROVIDER=supabase
 */

import * as firestoreServices from './firestoreService';
import * as supabaseServices from './supabaseService';

const provider = (import.meta.env.VITE_DB_PROVIDER || 'firestore').toLowerCase();
const useSupabase = provider === 'supabase';

if (useSupabase) {
  console.log('🟢 Database provider: Supabase');
} else {
  console.log('🔵 Database provider: Firestore');
}

// Re-export services from the active provider
export const clientService = useSupabase ? supabaseServices.clientService : firestoreServices.clientService;
export const staffService = useSupabase ? supabaseServices.staffService : firestoreServices.staffService;
export const appointmentService = useSupabase ? supabaseServices.appointmentService : firestoreServices.appointmentService;
export const transactionService = useSupabase ? supabaseServices.transactionService : firestoreServices.transactionService;
export const serviceService = useSupabase ? supabaseServices.serviceService : firestoreServices.serviceService;
export const productService = useSupabase ? supabaseServices.productService : firestoreServices.productService;
export const packageService = useSupabase ? supabaseServices.packageService : firestoreServices.packageService;
export const rewardService = useSupabase ? supabaseServices.rewardService : firestoreServices.rewardService;
export const outletService = useSupabase ? supabaseServices.outletService : firestoreServices.outletService;
export const apiIntegrationService = useSupabase ? supabaseServices.apiIntegrationService : firestoreServices.apiIntegrationService;

export const setCurrentOutletID = useSupabase ? supabaseServices.setCurrentOutletID : firestoreServices.setCurrentOutletID;
export const getCurrentOutletID = useSupabase ? supabaseServices.getCurrentOutletID : firestoreServices.getCurrentOutletID;

/** Which provider is active */
export const DB_PROVIDER = useSupabase ? 'supabase' : 'firestore';
