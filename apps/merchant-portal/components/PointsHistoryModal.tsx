/**
 * Points History Modal
 * Displays loyalty points balance, transaction history grouped by month, and Topup/Redeem actions.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { PointTransaction } from '../types';
import {
  AppModal,
  Button,
  Field,
  fieldControlClassName,
  FormSection,
  IconButton,
  ModalFooterActions,
} from './ui';

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

  // Real-time / polled listener for point transactions
  useEffect(() => {
    if (!clientId || !outletID) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const { pointTransactionService } = await import("../services/pointTransactionService");
        const data = await pointTransactionService.getAll(clientId, outletID);
        if (cancelled) return;
        setTransactions(data);
        setLoading(false);
        if (data.length > 0) onBalanceUpdate(data[0].newBalance);
      } catch (err) {
        console.error("Error loading point transactions:", err);
        if (!cancelled) {
          setError("Failed to load transaction history");
          setLoading(false);
        }
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, outletID]); // Removed onBalanceUpdate and currentBalance from deps to avoid re-subscription

  const handleTopup = async (e?: React.FormEvent) => {
    e?.preventDefault();
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

  const handleRedeem = async (e?: React.FormEvent) => {
    e?.preventDefault();
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

  const closeNested = () => {
    setShowTopupModal(false);
    setShowRedeemModal(false);
    setAmount('');
    setError(null);
  };

  return (
    <>
      <AppModal
        open
        onClose={onClose}
        title="Points"
        description="Loyalty balance and transaction history."
        size="md"
        zIndexClass="z-[50]"
        headerActions={
          <div className="relative">
            <IconButton
              label="Actions"
              size="md"
              variant="outline"
              onClick={() => setShowActionMenu(!showActionMenu)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </IconButton>
            {showActionMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-[var(--bg-surface)] rounded-ui-sm shadow-ui-lg border border-[var(--line)] py-1 z-10">
                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    setShowTopupModal(true);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
                >
                  Topup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    setShowRedeemModal(true);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
                >
                  Redeem
                </button>
              </div>
            )}
          </div>
        }
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </ModalFooterActions>
        }
      >
        <div className="rounded-ui-md border border-[var(--line)] bg-[var(--bg-soft)] px-4 py-3">
          <p className="text-app-label font-bold uppercase text-[var(--text-secondary)] mb-1">Balance</p>
          <p className="text-3xl font-bold text-emerald-600 tabular-nums">
            {currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-[var(--text-muted)] py-8">No transactions yet</p>
        ) : (
          <div className="space-y-6">
            {transactionsByMonth.map(([month, monthTransactions]) => (
              <div key={month}>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-3 uppercase tracking-wider">{month}</p>
                <div className="space-y-3">
                  {monthTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {tx.type} {tx.isManual ? '(Manual)' : ''}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {formatTimestamp(tx.timestamp)}
                          {tx.description && <span className="block mt-0.5 font-mono text-[10px]">{tx.description}</span>}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold ${
                          tx.type === 'Topup' ? 'text-emerald-600' :
                          tx.type === 'Redeem' ? 'text-[var(--danger)]' :
                          'text-amber-600'
                        }`}>
                          {tx.type === 'Topup' ? '+' : '−'}{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs font-medium text-[var(--brand)]">
                          {tx.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </AppModal>

      <AppModal
        open={showTopupModal}
        onClose={closeNested}
        title="Topup Points"
        size="sm"
        zIndexClass="z-[60]"
        busy={processing}
        asForm
        formId="points-topup-form"
        onSubmit={handleTopup}
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={closeNested} disabled={processing}>
              Cancel
            </Button>
            <Button type="submit" form="points-topup-form" disabled={processing}>
              {processing ? 'Processing…' : 'Add Points'}
            </Button>
          </ModalFooterActions>
        }
      >
        <FormSection>
          <Field id="points-topup-amount" label="Amount" required error={error ?? undefined}>
            <input
              id="points-topup-amount"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className={fieldControlClassName}
              autoFocus
            />
          </Field>
        </FormSection>
      </AppModal>

      <AppModal
        open={showRedeemModal}
        onClose={closeNested}
        title="Redeem Points"
        size="sm"
        zIndexClass="z-[60]"
        busy={processing}
        asForm
        formId="points-redeem-form"
        onSubmit={handleRedeem}
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={closeNested} disabled={processing}>
              Cancel
            </Button>
            <Button type="submit" form="points-redeem-form" variant="danger" disabled={processing}>
              {processing ? 'Processing…' : 'Redeem Points'}
            </Button>
          </ModalFooterActions>
        }
      >
        <FormSection>
          <Field id="points-redeem-amount" label="Amount" required error={error ?? undefined}>
            <input
              id="points-redeem-amount"
              type="number"
              min="1"
              step="1"
              max={currentBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className={fieldControlClassName}
              autoFocus
            />
          </Field>
        </FormSection>
      </AppModal>
    </>
  );
};

export default PointsHistoryModal;
