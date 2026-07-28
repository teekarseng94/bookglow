/**
 * Outstanding History Modal
 * Same pattern as Points: balance, transaction history by month, Add / Minus actions.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { OutstandingTransaction } from '../types';
import {
  AppModal,
  Button,
  Field,
  fieldControlClassName,
  FormSection,
  IconButton,
  ModalFooterActions,
} from './ui';

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

    let cancelled = false;
    const load = async () => {
      try {
        const { outstandingTransactionService } = await import(
          "../services/outstandingTransactionService"
        );
        const data = await outstandingTransactionService.getAll(clientId, outletID);
        if (cancelled) return;
        setTransactions(data);
        setLoading(false);
        if (data.length > 0) onBalanceUpdate(data[0].newBalance);
      } catch (err) {
        console.error("Error loading outstanding transactions:", err);
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
  }, [clientId, outletID]);

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
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

  const handleMinus = async (e?: React.FormEvent) => {
    e?.preventDefault();
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

  const closeNested = () => {
    setShowAddModal(false);
    setShowMinusModal(false);
    setAmount('');
    setError(null);
  };

  const renderDateTimeFields = (prefix: string) => (
    <>
      <Field id={`${prefix}-amount`} label="Amount" required error={error ?? undefined}>
        <input
          id={`${prefix}-amount`}
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          className={fieldControlClassName}
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id={`${prefix}-date`} label="Date">
          <input
            id={`${prefix}-date`}
            type="date"
            value={actionDate}
            onChange={(e) => setActionDate(e.target.value)}
            className={fieldControlClassName}
          />
        </Field>
        <Field id={`${prefix}-time`} label="Time">
          <input
            id={`${prefix}-time`}
            type="time"
            value={actionTime}
            onChange={(e) => setActionTime(e.target.value)}
            className={fieldControlClassName}
          />
        </Field>
      </div>
    </>
  );

  return (
    <>
      <AppModal
        open
        onClose={onClose}
        title="Outstanding"
        description="Balance and transaction history."
        size="md"
        zIndexClass="z-[50]"
        headerActions={
          <div className="relative">
            <IconButton
              label="Actions"
              size="md"
              variant="outline"
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="border-[var(--danger)] text-[var(--danger)] hover:bg-red-50"
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
                    setShowAddModal(true);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    setShowMinusModal(true);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
                >
                  Minus
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
        <div className="rounded-ui-md border border-[var(--line)] px-4 py-3" style={{ backgroundColor: OUTSTANDING_BG }}>
          <p className="text-app-label font-bold uppercase text-[var(--text-secondary)] mb-1">Balance</p>
          <p className="text-3xl font-bold tabular-nums" style={{ color: OUTSTANDING_RED }}>
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
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: OUTSTANDING_BG }}
                      >
                        <span className="text-lg font-bold" style={{ color: OUTSTANDING_RED }}>$</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {tx.type} {tx.isManual ? '(Manual)' : ''}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {formatTimestamp(tx.timestamp)}
                          {tx.description && <span className="m-mono-caption block mt-0.5">{tx.description}</span>}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold ${tx.type === 'Add' ? 'text-[var(--danger)]' : 'text-emerald-600'}`}>
                          {tx.type === 'Add' ? '+' : '−'}{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs font-medium text-[var(--text-secondary)]">
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
        open={showAddModal}
        onClose={closeNested}
        title="Add Outstanding"
        size="sm"
        zIndexClass="z-[60]"
        busy={processing}
        asForm
        formId="outstanding-add-form"
        onSubmit={handleAdd}
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={closeNested} disabled={processing}>
              Cancel
            </Button>
            <Button type="submit" form="outstanding-add-form" variant="danger" disabled={processing}>
              {processing ? 'Processing…' : 'Add'}
            </Button>
          </ModalFooterActions>
        }
      >
        <FormSection>{renderDateTimeFields('outstanding-add')}</FormSection>
      </AppModal>

      <AppModal
        open={showMinusModal}
        onClose={closeNested}
        title="Minus Outstanding"
        size="sm"
        zIndexClass="z-[60]"
        busy={processing}
        asForm
        formId="outstanding-minus-form"
        onSubmit={handleMinus}
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={closeNested} disabled={processing}>
              Cancel
            </Button>
            <Button type="submit" form="outstanding-minus-form" disabled={processing}>
              {processing ? 'Processing…' : 'Minus'}
            </Button>
          </ModalFooterActions>
        }
      >
        <FormSection>{renderDateTimeFields('outstanding-minus')}</FormSection>
      </AppModal>
    </>
  );
};

export default OutstandingHistoryModal;
