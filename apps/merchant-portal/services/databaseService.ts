/**
 * Database service — Firestore-only export layer.
 *
 * The merchant portal uses Firestore as its sole database. Import from this
 * module instead of `firestoreService` directly so call sites stay stable.
 */

import * as firestoreServices from './firestoreService';

console.log('🔵 Database provider: Firestore');

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

/** Active database provider */
export const DB_PROVIDER = 'firestore';
