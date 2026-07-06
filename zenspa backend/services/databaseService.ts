/**
 * Database Service Provider Switch
 *
 * Firestore is currently the ONLY active database provider.
 *
 * Supabase is intentionally NOT imported here so that the Supabase client
 * (lib/supabase.ts) is never initialized at app startup and the app does not
 * require VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_DB_PROVIDER.
 *
 * The Supabase service layer (services/supabaseService.ts) and the prepared
 * SQL migrations under migration/ are kept for a future Firestore→Supabase
 * migration, but must remain unreferenced by the active app bundle.
 *
 * Usage: import from this file instead of firestoreService directly.
 */

import * as firestoreServices from './firestoreService';

console.log('🔵 Database provider: Firestore');

// Re-export the Firestore service layer as the active database.
export const clientService = firestoreServices.clientService;
export const staffService = firestoreServices.staffService;
export const appointmentService = firestoreServices.appointmentService;
export const transactionService = firestoreServices.transactionService;
export const serviceService = firestoreServices.serviceService;
export const productService = firestoreServices.productService;
export const packageService = firestoreServices.packageService;
export const rewardService = firestoreServices.rewardService;
export const outletService = firestoreServices.outletService;
export const apiIntegrationService = firestoreServices.apiIntegrationService;

export const setCurrentOutletID = firestoreServices.setCurrentOutletID;
export const getCurrentOutletID = firestoreServices.getCurrentOutletID;

/** Which provider is active */
export const DB_PROVIDER = 'firestore';
