/**
 * Credit Wallet Modal
 * Balance in large green font, action menu (Top Up / Deduct Credit), forms with staff remark, history grouped by month.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { CreditHistoryEntry } from '../types';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface CreditWalletModalProps {
  clientId: string;
  outletID: string;
  currentBalance: number;
  staffName: string;
  onClose: () => void;
  onBalanceUpdate: (newBalance: number) => void;
  onUpdateCredit: (amount: number, type: 'topup' | 'deduction', staffRemark: string) => Promise<number>;
}

const CreditWalletModal: React.FC<CreditWalletModalProps> = ({
  clientId,
  outletID,
  currentBalance,
  staffName,
  onClose,
  onBalanceUpdate,
  onUpdateCredit
}) => {
  const [history, setHistory] = useState<CreditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [showDeductForm, setShowDeductForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [staffRemark, setStaffRemark] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId || !outletID) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'clients', clientId, 'credit_history'),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        } as CreditHistoryEntry));
        setHistory(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading credit history:', err);
        setError('Failed to load credit history');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [clientId, outletID]);

  const historyByMonth = useMemo(() => {
    const map: Record<string, CreditHistoryEntry[]> = {};
    history.forEach((entry) => {
      const d = new Date(entry.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [history]);

  const openTopUp = () => {
    setShowActionMenu(false);
    setShowDeductForm(false);
    setAmount('');
    setStaffRemark('');
    setError(null);
    setShowTopUpForm(true);
  };

  const openDeduct = () => {
    setShowActionMenu(false);
    setShowTopUpForm(false);
    setAmount('');
    setStaffRemark('');
    setError(null);
    setShowDeductForm(true);
  };

  const submitTopUp = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (!staffRemark.trim()) {
      setError('Staff remark is required.');
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const newBalance = await onUpdateCredit(num, 'topup', staffRemark.trim());
      onBalanceUpdate(newBalance);
      setShowTopUpForm(false);
      setAmount('');
      setStaffRemark('');
    } catch (err: any) {
      setError(err.message || 'Failed to top up credit.');
    } finally {
      setProcessing(false);
    }
  };

  const submitDeduct = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (!staffRemark.trim()) {
      setError('Staff remark is required.');
      return;
    }
    if (num > currentBalance) {
      setError(`Amount cannot exceed current balance (${currentBalance.toFixed(2)}).`);
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const newBalance = await onUpdateCredit(num, 'deduction', staffRemark.trim());
      onBalanceUpdate(newBalance);
      setShowDeductForm(false);
      setAmount('');
      setStaffRemark('');
    } catch (err: any) {
      setError(err.message || 'Failed to deduct credit.');
    } finally {
      setProcessing(false);
    }
  };

  const formatMonth = (key: string) => {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-bold text-slate-800">Credits</h3>
          <div className="relative">
            <button
              onClick={() => setShowActionMenu((v) => !v)}
              className="p-2 rounded-full bg-teal-100 text-teal-600 hover:bg-teal-200 transition-colors"
              aria-label="Actions"
            >
              <Plus className="w-5 h-5" />
            </button>
            {showActionMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActionMenu(false)} aria-hidden="true" />
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-20">
                  <button
                    onClick={openTopUp}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left text-slate-700 hover:bg-slate-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    Top Up Credit
                  </button>
                  <button
                    onClick={openDeduct}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left text-slate-700 hover:bg-slate-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                      <Minus className="w-4 h-4" />
                    </div>
                    Deduct Credit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Balance */}
        <div className="px-4 pt-2 pb-4">
          <p className="text-sm font-medium text-slate-500">Balance</p>
          <p className="text-3xl font-bold text-emerald-600">{currentBalance.toFixed(2)}</p>
        </div>

        {/* Top Up / Deduct forms */}
        {(showTopUpForm || showDeductForm) && (
          <div className="px-4 pb-4 border-b border-slate-100 bg-slate-50/50 rounded-xl mx-4 mb-4 p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">
              {showTopUpForm ? 'Top Up Credit' : 'Deduct Credit'}
            </h4>
            {error && (
              <div className="mb-3 p-2 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Staff remark (required)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid via Bank Transfer"
                  value={staffRemark}
                  onChange={(e) => setStaffRemark(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={showTopUpForm ? submitTopUp : submitDeduct}
                  disabled={processing}
                  className={`flex-1 py-2.5 rounded-xl font-medium text-white transition-colors ${
                    showTopUpForm ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50`}
                >
                  {processing ? 'Processing...' : showTopUpForm ? 'Top Up' : 'Deduct'}
                </button>
                <button
                  onClick={() => {
                    setShowTopUpForm(false);
                    setShowDeductForm(false);
                    setAmount('');
                    setStaffRemark('');
                    setError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">History</h4>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : historyByMonth.length === 0 ? (
            <p className="text-slate-500 text-sm">No credit transactions yet.</p>
          ) : (
            <div className="space-y-6">
              {historyByMonth.map(([monthKey, entries]) => (
                <div key={monthKey}>
                  <p className="text-xs font-medium text-slate-500 mb-2">{formatMonth(monthKey)}</p>
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-xs text-slate-500">{formatTime(entry.timestamp)}</span>
                          <span
                            className={`font-bold ${
                              entry.type === 'topup' ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {entry.type === 'topup' ? '+' : '-'}
                            {entry.amount.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 mt-1">{entry.staffRemark}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {entry.staffName} · Balance after: {entry.newBalance.toFixed(2)}
                        </p>
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
  );
};

export default CreditWalletModal;
