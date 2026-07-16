/**
 * Outstanding History Modal
 * Same pattern as Points: balance, transaction history by month, Add / Minus actions.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { OutstandingTransaction } from '../types';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const OUTSTANDING_RED = '#f44336';
const OUTSTANDING_BG = '#ffedeb';

interface OutstandingHistoryModalProps {
  clientId: string;
  outletID: string;
  currentBalance: number;
  onClose: () => void;
  onBalanceUpdate: (newBalance: number) => void;
}

const OutstandingHistoryModal: React.FC<OutstandingHistoryModalProps> = ({
  clientId,
  outletID,
  currentBalance,
  onClose,
  onBalanceUpdate
}) => {
  const [transactions, setTransactions] = useState<OutstandingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMinusModal, setShowMinusModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [actionDate, setActionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [actionTime, setActionTime] = useState<string>(() => new Date().toTimeString().slice(0, 5));
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId || !outletID) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'clients', clientId, 'outstandingTransactions'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as OutstandingTransaction));
        setTransactions(data);
        setLoading(false);
        if (data.length > 0) {
          onBalanceUpdate(data[0].newBalance);
        }
      },
      (err) => {
        console.error('Error loading outstanding transactions:', err);
        setError('Failed to load transaction history');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId, outletID]);

  const handleAdd = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setError('Please enter a valid positive number');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const { outstandingTransactionService } = await import('../services/outstandingTransactionService');
      const date = new Date(actionDate + 'T' + (actionTime || '00:00'));
      await outstandingTransactionService.add(clientId, 'Add', value, outletID, date.toISOString());
      setShowAddModal(false);
      setAmount('');
      setActionDate(new Date().toISOString().split('T')[0]);
      setActionTime(new Date().toTimeString().slice(0, 5));
    } catch (err: any) {
      setError(err.message || 'Failed to add outstanding');
    } finally {
      setProcessing(false);
    }
  };

  const handleMinus = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setError('Please enter a valid positive number');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const { outstandingTransactionService } = await import('../services/outstandingTransactionService');
      const date = new Date(actionDate + 'T' + (actionTime || '00:00'));
      await outstandingTransactionService.add(clientId, 'Minus', value, outletID, date.toISOString());
      setShowMinusModal(false);
      setAmount('');
      setActionDate(new Date().toISOString().split('T')[0]);
      setActionTime(new Date().toTimeString().slice(0, 5));
    } catch (err: any) {
      setError(err.message || 'Failed to deduct outstanding');
    } finally {
      setProcessing(false);
    }
  };

  const transactionsByMonth = useMemo(() => {
    const groups: Record<string, OutstandingTransaction[]> = {};
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
              <h3 className="text-lg font-bold text-slate-800">Outstanding</h3>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowActionMenu(!showActionMenu)}
                className="p-2 rounded-lg border-2 transition-colors"
                style={{ borderColor: OUTSTANDING_RED, color: OUTSTANDING_RED }}
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
                      setShowAddModal(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <div className="w-6 h-6 rounded-full text-white flex items-center justify-center text-xs" style={{ backgroundColor: OUTSTANDING_RED }}>+</div>
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowActionMenu(false);
                      setShowMinusModal(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <div className="w-6 h-6 rounded-full text-white flex items-center justify-center text-xs" style={{ backgroundColor: OUTSTANDING_RED }}>−</div>
                    Minus
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Balance</p>
            <p className="text-4xl font-bold" style={{ color: OUTSTANDING_RED }}>
              {currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

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
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: OUTSTANDING_BG }}
                          >
                            <span className="text-lg font-bold" style={{ color: OUTSTANDING_RED }}>$</span>
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
                            <p className={`text-sm font-bold ${tx.type === 'Add' ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {tx.type === 'Add' ? '+' : '−'}{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs font-medium text-slate-600">{tx.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
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

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Add Outstanding</h3>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full p-3 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-teal-500 outline-none"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={actionDate}
                  onChange={(e) => setActionDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                  Time
                </label>
                <input
                  type="time"
                  value={actionTime}
                  onChange={(e) => setActionTime(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>
            {error && <p className="text-sm text-rose-600 mb-4">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAmount('');
                  setError(null);
                }}
                className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={processing}
                className="flex-1 py-2 text-white font-bold rounded-xl disabled:opacity-50"
                style={{ backgroundColor: OUTSTANDING_RED }}
              >
                {processing ? 'Processing...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMinusModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Minus Outstanding</h3>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full p-3 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-teal-500 outline-none"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={actionDate}
                  onChange={(e) => setActionDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                  Time
                </label>
                <input
                  type="time"
                  value={actionTime}
                  onChange={(e) => setActionTime(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>
            {error && <p className="text-sm text-rose-600 mb-4">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMinusModal(false);
                  setAmount('');
                  setError(null);
                }}
                className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleMinus}
                disabled={processing}
                className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Minus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OutstandingHistoryModal;
