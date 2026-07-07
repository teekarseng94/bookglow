/**
 * Point Transaction Service
 * Separate file to avoid circular dependencies with firestoreService
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  runTransaction,
  increment,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { PointTransaction } from '../types';

// Current outlet ID — set by useFirestoreData from the logged-in user's Firestore document
let currentOutletID = '';

export const setCurrentOutletID = (outletID: string) => {
  currentOutletID = outletID || '';
};

export const getCurrentOutletID = () => currentOutletID;

function hasValidOutlet(outletID: string | undefined): boolean {
  return outletID != null && String(outletID).trim().length > 0;
}

export const pointTransactionService = {
  // Get all point transactions for a client (subcollection: clients/{clientId}/pointTransactions)
  getAll: async (clientId: string, outletID: string = currentOutletID): Promise<PointTransaction[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const q = query(
      collection(db, 'clients', clientId, 'pointTransactions'),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PointTransaction));
  },

  // Add a point transaction (Topup or Redeem) with atomic increment
  add: async (
    clientId: string,
    type: 'Topup' | 'Redeem',
    amount: number,
    outletID: string = currentOutletID
  ): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required.');
    if (amount <= 0) throw new Error('Amount must be positive.');
    
    const clientRef = doc(db, 'clients', clientId);
    const pointTransactionsRef = collection(db, 'clients', clientId, 'pointTransactions');

    return await runTransaction(db, async (transaction) => {
      const clientDoc = await transaction.get(clientRef);
      if (!clientDoc.exists()) throw new Error('Client not found');
      
      const clientData = clientDoc.data();
      if (clientData.outletID !== outletID) throw new Error('Client does not belong to this outlet');
      
      const currentBalance = clientData.points || 0;
      const previousBalance = currentBalance;
      const pointsChange = type === 'Topup' ? amount : -amount;
      const newBalance = Math.max(0, currentBalance + pointsChange);
      
      if (type === 'Redeem' && newBalance < 0) {
        throw new Error('Insufficient points balance');
      }
      
      // Atomic increment on client points
      transaction.update(clientRef, { points: increment(pointsChange) });
      
      // Create transaction log
      const transactionData: Omit<PointTransaction, 'id'> = {
        clientId,
        outletID,
        type,
        amount,
        previousBalance,
        newBalance,
        timestamp: new Date().toISOString(),
        isManual: true
      };
      
      const docRef = doc(pointTransactionsRef);
      transaction.set(docRef, transactionData);
      
      return docRef.id;
    });
  },

  /**
   * Deduct points when a sale is deleted. Creates a point transaction log entry.
   * This should be called within a Firestore transaction that also deletes the sale.
   */
  deductForSaleDeletion: async (
    clientId: string,
    pointsToDeduct: number,
    receiptNumber: string,
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error('outletID is required.');
    if (pointsToDeduct <= 0) return; // No points to deduct
    
    const clientRef = doc(db, 'clients', clientId);
    const pointTransactionsRef = collection(db, 'clients', clientId, 'pointTransactions');

    return await runTransaction(db, async (transaction) => {
      const clientDoc = await transaction.get(clientRef);
      if (!clientDoc.exists()) throw new Error('Client not found');
      
      const clientData = clientDoc.data();
      if (clientData.outletID !== outletID) throw new Error('Client does not belong to this outlet');
      
      const currentBalance = clientData.points || 0;
      const previousBalance = currentBalance;
      const newBalance = Math.max(0, currentBalance - pointsToDeduct);
      
      // Atomic decrement on client points
      transaction.update(clientRef, { points: increment(-pointsToDeduct) });
      
      // Create transaction log
      const transactionData: Omit<PointTransaction, 'id'> = {
        clientId,
        outletID,
        type: 'Deduction (Sale Deleted)',
        amount: pointsToDeduct,
        previousBalance,
        newBalance,
        timestamp: new Date().toISOString(),
        isManual: false,
        description: `Receipt #${receiptNumber}`
      };
      
      const docRef = doc(pointTransactionsRef);
      transaction.set(docRef, transactionData);
    });
  }
};
