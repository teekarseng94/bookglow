/**
 * Points History Modal
 * Displays loyalty points balance, transaction history grouped by month, and Topup/Redeem actions.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { PointTransaction } from '../types';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface PointsHistoryModalProps {
  clientId: string;
  outletID: string;
  currentBalance: number;
  onClose: () => void;
  onBalanceUpdate: (newBalance: number) => void;
}

const PointsHistoryModal: React.FC<PointsHistoryModalProps> = ({
  clientId,
  outletID,
  currentBalance,
  onClose,
  onBalanceUpdate
}) => {
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time listener for point transactions
  useEffect(() => {
    if (!clientId || !outletID) {
      setLoading(false);
      return;
    }
    
    const q = query(
      collection(db, 'clients', clientId, 'pointTransactions'),
      orderBy('timestamp', 'desc')
    );
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PointTransaction));
        setTransactions(data);
        setLoading(false);
        // Update balance from latest transaction if available
        if (data.length > 0) {
          onBalanceUpdate(data[0].newBalance);
        }
      },
      (err) => {
        console.error('Error loading point transactions:', err);
        setError('Failed to load transaction history');
        setLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, outletID]); // Removed onBalanceUpdate and currentBalance from deps to avoid re-subscription

  const handleTopup = async () => {
    const points = parseFloat(amount);
    if (!points || points <= 0) {
      setError('Please enter a valid positive number');
      return;
    }
    
    setProcessing(true);
    setError(null);
    try {
      // Import from separate service file to avoid circular dependency
      const { pointTransactionService } = await import('../services/pointTransactionService');
      await pointTransactionService.add(clientId, 'Topup', points, outletID);
      setShowTopupModal(false);
      setAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to add points');
    } finally {
      setProcessing(false);
    }
  };

  const handleRedeem = async () => {
    const points = parseFloat(amount);
    if (!points || points <= 0) {
      setError('Please enter a valid positive number');
      return;
    }
    
    setProcessing(true);
    setError(null);
    try {
      // Import from separate service file to avoid circular dependency
      const { pointTransactionService } = await import('../services/pointTransactionService');
      await pointTransactionService.add(clientId, 'Redeem', points, outletID);
      setShowRedeemModal(false);
      setAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to redeem points');
    } finally {
      setProcessing(false);
    }
  };

  // Group transactions by month
  const transactionsByMonth = useMemo(() => {
    const groups: Record<string, PointTransaction[]> = {};
    transactions.forEach((tx) => {
      const date = new Date(tx.timestamp);
      const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(tx);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });
  }, [transactions]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${time}, ${dateStr}`;
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-scaleIn overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-lg font-bold text-slate-800">Points</h3>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowActionMenu(!showActionMenu)}
                className="p-2 rounded-lg border-2 border-blue-500 text-blue-600 hover:bg-blue-50 transition-colors"
                aria-label="Actions"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m-8-8h16" />
                </svg>
              </button>
              {showActionMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-10">
                  <button
                    onClick={() => {
                      setShowActionMenu(false);
                      setShowTopupModal(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">+</div>
                    Topup
                  </button>
                  <button
                    onClick={() => {
                      setShowActionMenu(false);
                      setShowRedeemModal(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">−</div>
                    Redeem
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Balance */}
          <div className="p-6 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Balance</p>
            <p className="text-4xl font-bold text-emerald-600">{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-center text-slate-400 py-8">No transactions yet</p>
            ) : (
              <div className="space-y-6">
                {transactionsByMonth.map(([month, monthTransactions]) => (
                  <div key={month}>
                    <p className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">{month}</p>
                    <div className="space-y-3">
                      {monthTransactions.map((tx) => (
                        <div key={tx.id} className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">
                              {tx.type} {tx.isManual ? '(Manual)' : ''}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatTimestamp(tx.timestamp)}
                              {tx.description && <span className="block mt-0.5 font-mono text-[10px]">{tx.description}</span>}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-bold ${
                              tx.type === 'Topup' ? 'text-emerald-600' : 
                              tx.type === 'Redeem' ? 'text-rose-600' : 
                              'text-amber-600'
                            }`}>
                              {tx.type === 'Topup' ? '+' : '−'}{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs font-medium text-blue-600">{tx.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Topup Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Topup Points</h3>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full p-3 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-teal-500 outline-none"
              autoFocus
            />
            {error && <p className="text-sm text-rose-600 mb-4">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTopupModal(false);
                  setAmount('');
                  setError(null);
                }}
                className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleTopup}
                disabled={processing}
                className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Add Points'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redeem Modal */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Redeem Points</h3>
            <input
              type="number"
              min="1"
              step="1"
              max={currentBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full p-3 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-teal-500 outline-none"
              autoFocus
            />
            {error && <p className="text-sm text-rose-600 mb-4">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRedeemModal(false);
                  setAmount('');
                  setError(null);
                }}
                className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRedeem}
                disabled={processing}
                className="flex-1 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Redeem Points'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PointsHistoryModal;
