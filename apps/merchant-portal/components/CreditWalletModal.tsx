/**
 * Credit Wallet Modal
 * Balance in large green font, action menu (Top Up / Deduct Credit), forms with staff remark, history grouped by month.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Minus } from 'lucide-react';
import { CreditHistoryEntry } from '../types';
import {
  AppModal,
  Button,
  Field,
  fieldControlClassName,
  FormSection,
  IconButton,
  ModalFooterActions,
} from './ui';

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

    let cancelled = false;
    const load = async () => {
      try {
        const { listCreditHistory } = await import("../services/supabaseMerchant");
        const data = await listCreditHistory(clientId, outletID);
        if (cancelled) return;
        setHistory(data);
        setLoading(false);
      } catch (err) {
        console.error("Error loading credit history:", err);
        if (!cancelled) {
          setError("Failed to load credit history");
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
    <AppModal
      open
      onClose={onClose}
      title="Credits"
      description="Wallet balance, adjustments, and history."
      size="md"
      zIndexClass="z-[50]"
      busy={processing}
      headerActions={
        <div className="relative">
          <IconButton
            label="Actions"
            size="md"
            variant="soft"
            onClick={() => setShowActionMenu((v) => !v)}
          >
            <Plus className="w-5 h-5" />
          </IconButton>
          {showActionMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowActionMenu(false)} aria-hidden="true" />
              <div className="absolute right-0 mt-1 w-48 bg-[var(--bg-surface)] rounded-ui-sm border border-[var(--line)] shadow-ui-lg py-1 z-20">
                <button
                  type="button"
                  onClick={openTopUp}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--success-soft)] text-[var(--success)] flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  Top Up Credit
                </button>
                <button
                  type="button"
                  onClick={openDeduct}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--danger-soft)] text-[var(--danger)] flex items-center justify-center">
                    <Minus className="w-4 h-4" />
                  </div>
                  Deduct Credit
                </button>
              </div>
            </>
          )}
        </div>
      }
      footer={
        <ModalFooterActions>
          <Button variant="secondary" onClick={onClose} disabled={processing}>
            Close
          </Button>
        </ModalFooterActions>
      }
    >
      <div className="rounded-ui-md border border-[var(--line)] bg-[var(--bg-soft)] px-4 py-3">
        <p className="m-settings-label uppercase text-[var(--text-secondary)] mb-1">Balance</p>
        <p className="text-app-page font-bold text-[var(--success)] tabular-nums">{currentBalance.toFixed(2)}</p>
      </div>

      {(showTopUpForm || showDeductForm) && (
        <div className="rounded-ui-md border border-[var(--line)] bg-[var(--bg-soft)] p-4">
          <FormSection title={showTopUpForm ? 'Top Up Credit' : 'Deduct Credit'}>
            {error && (
              <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>
            )}
            <Field id="credit-amount" label="Amount" required>
              <input
                id="credit-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={fieldControlClassName}
              />
            </Field>
            <Field id="credit-remark" label="Staff remark" required>
              <input
                id="credit-remark"
                type="text"
                placeholder="e.g. Paid via Bank Transfer"
                value={staffRemark}
                onChange={(e) => setStaffRemark(e.target.value)}
                className={fieldControlClassName}
              />
            </Field>
            <ModalFooterActions className="!justify-start">
              <Button
                variant={showTopUpForm ? 'primary' : 'danger'}
                onClick={showTopUpForm ? submitTopUp : submitDeduct}
                disabled={processing}
              >
                {processing ? 'Processing…' : showTopUpForm ? 'Top Up' : 'Deduct'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowTopUpForm(false);
                  setShowDeductForm(false);
                  setAmount('');
                  setStaffRemark('');
                  setError(null);
                }}
                disabled={processing}
              >
                Cancel
              </Button>
            </ModalFooterActions>
          </FormSection>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">History</h4>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : historyByMonth.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm">No credit transactions yet.</p>
        ) : (
          <div className="space-y-6">
            {historyByMonth.map(([monthKey, entries]) => (
              <div key={monthKey}>
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">{formatMonth(monthKey)}</p>
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)] p-3"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs text-[var(--text-secondary)]">{formatTime(entry.timestamp)}</span>
                        <span
                          className={`font-bold ${
                            entry.type === 'topup' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                          }`}
                        >
                          {entry.type === 'topup' ? '+' : '-'}
                          {entry.amount.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] mt-1">{entry.staffRemark}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
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
    </AppModal>
  );
};

export default CreditWalletModal;
