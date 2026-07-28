import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Client, Staff } from '../types';
import {
  AppModal,
  Button,
  Field,
  fieldControlClassName,
  FormSection,
  ModalFooterActions,
  ConfirmationDialog,
  IconButton,
} from './ui';

interface TransactionDetailModalProps {
  transaction: Transaction;
  client: Client | undefined;
  staff: Staff[];
  onClose: () => void;
  onVoid: (transactionId: string) => Promise<void>;
  onUpdate?: (id: string, updates: Partial<Transaction>) => Promise<void>;
  /** Optional: list of payment methods for the Edit payment dropdown (e.g. from outlet settings) */
  paymentMethods?: string[];
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  client,
  staff,
  onClose,
  onVoid,
  onUpdate,
  paymentMethods = [],
}) => {
  const [isVoiding, setIsVoiding] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [showEditDate, setShowEditDate] = useState(false);
  const [editedDate, setEditedDate] = useState(transaction.date.split('T')[0]);
  const [editedTime, setEditedTime] = useState(() => {
    const date = new Date(transaction.date);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  });
  const [remarks, setRemarks] = useState(transaction.remarks || '');
  const [showEditPayment, setShowEditPayment] = useState(false);
  const [editedPaymentMethod, setEditedPaymentMethod] = useState(transaction.paymentMethod ?? '');
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    setEditedPaymentMethod(transaction.paymentMethod ?? '');
  }, [transaction.paymentMethod]);

  const receiptNumber = useMemo(() => {
    const num = transaction.id.replace(/\D/g, '').slice(-10) || transaction.id.slice(-8);
    return '#' + num.padStart(10, '0');
  }, [transaction.id]);

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${timeStr}, ${dateStr}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const pointsToDeduct = useMemo(() => {
    if (
      transaction.type !== 'SALE' ||
      !transaction.clientId ||
      transaction.clientId === 'guest' ||
      transaction.category === 'Redemption'
    ) {
      return 0;
    }
    if (transaction.items && transaction.items.length > 0) {
      return transaction.items.reduce((sum, item) => {
        const itemPoints = item.points !== undefined ? item.points : Math.floor(item.price);
        return sum + itemPoints * item.quantity;
      }, 0);
    }
    return Math.floor(transaction.amount);
  }, [transaction]);

  const voidDescription = useMemo(() => {
    const clientName = client?.name || 'Guest';
    return pointsToDeduct > 0
      ? `Voiding this order will deduct ${pointsToDeduct.toLocaleString()} points from ${clientName}. Are you sure you want to void this transaction?`
      : 'Are you sure you want to void this transaction?';
  }, [client?.name, pointsToDeduct]);

  const handleVoidConfirm = async () => {
    setIsVoiding(true);
    try {
      await onVoid(transaction.id);
      setShowVoidConfirm(false);
      onClose();
    } catch (error: any) {
      alert(`Failed to void transaction: ${error.message || 'Unknown error'}`);
    } finally {
      setIsVoiding(false);
    }
  };

  const handleSaveDate = async () => {
    if (!onUpdate) return;
    const [hours, minutes] = editedTime.split(':');
    const newDate = new Date(editedDate);
    newDate.setHours(parseInt(hours), parseInt(minutes));
    await onUpdate(transaction.id, { date: newDate.toISOString() });
    setShowEditDate(false);
  };

  const handleSaveRemarks = async () => {
    if (!onUpdate) return;
    await onUpdate(transaction.id, { remarks });
  };

  const handleSavePayment = async () => {
    if (!onUpdate) return;
    const method = (editedPaymentMethod ?? '').trim() || (paymentMethods[0] ?? '');
    setSavingPayment(true);
    try {
      await onUpdate(transaction.id, { paymentMethod: method });
      setShowEditPayment(false);
    } catch (e: any) {
      alert(e?.message || 'Failed to update payment method');
    } finally {
      setSavingPayment(false);
    }
  };

  const itemStaffDetails = useMemo(() => {
    if (!transaction.items) return [];
    return transaction.items.map((item) => {
      const staffMember = item.staffId ? staff.find((s) => s.id === item.staffId) : null;
      return {
        ...item,
        staffName: staffMember?.name || '—',
      };
    });
  }, [transaction.items, staff]);

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 4) return phone;
    return '...' + phone.slice(-4);
  };

  return (
    <>
      <AppModal
        open
        onClose={onClose}
        title={receiptNumber}
        size="sm"
        busy={isVoiding}
        headerActions={
          <IconButton label="Print" size="md" onClick={handlePrint}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
          </IconButton>
        }
        footer={
          transaction.status !== 'voided' ? (
            <ModalFooterActions>
              <Button variant="secondary" onClick={onClose} disabled={isVoiding}>
                Close
              </Button>
              <Button variant="danger" onClick={() => setShowVoidConfirm(true)} disabled={isVoiding}>
                {isVoiding ? 'Voiding…' : 'Void Order'}
              </Button>
            </ModalFooterActions>
          ) : (
            <ModalFooterActions>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </ModalFooterActions>
          )
        }
      >
        {client && (
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--line)]">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand-deep)] font-bold text-base md:text-lg flex-shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[var(--text-primary)] truncate">{client.name}</p>
              <p className="text-sm text-[var(--text-secondary)]">{maskPhone(client.phone)}</p>
            </div>
          </div>
        )}

        <div className="pb-3 border-b border-[var(--line)]">
          {showEditDate ? (
            <div className="flex flex-wrap items-end gap-2">
              <Field id="txn-edit-date" label="Date" className="flex-1 min-w-[8rem]">
                <input
                  id="txn-edit-date"
                  type="date"
                  value={editedDate}
                  onChange={(e) => setEditedDate(e.target.value)}
                  className={fieldControlClassName}
                />
              </Field>
              <Field id="txn-edit-time" label="Time" className="flex-1 min-w-[7rem]">
                <input
                  id="txn-edit-time"
                  type="time"
                  value={editedTime}
                  onChange={(e) => setEditedTime(e.target.value)}
                  className={fieldControlClassName}
                />
              </Field>
              <div className="flex gap-2 pb-0.5">
                <Button size="sm" onClick={handleSaveDate}>
                  Save
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setShowEditDate(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-[var(--text-secondary)]">{formatTimestamp(transaction.date)}</p>
              {onUpdate && (
                <Button size="sm" variant="ghost" onClick={() => setShowEditDate(true)}>
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>

        <FormSection title="Service">
          <div className="space-y-2">
            {itemStaffDetails.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-[var(--bg-soft)] rounded-ui-md border border-[var(--line)]"
              >
                <div className="w-10 h-10 bg-[var(--bg-selection)] rounded-ui-sm flex items-center justify-center text-[var(--text-secondary)] font-bold text-xs flex-shrink-0">
                  {item.type === 'service' ? 'S' : item.type === 'product' ? 'P' : 'PKG'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[var(--text-primary)]">{item.name}</span>
                    <span className="px-2 py-0.5 bg-[var(--brand-soft)] text-[var(--brand-deep)] text-xs font-bold rounded-ui-sm">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[var(--text-muted)]">Staff: </span>
                      <span className="font-semibold text-[var(--text-primary)]">{item.staffName}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Price: </span>
                      <span className="font-bold text-[var(--brand)]">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection title="Staff">
          <div className="bg-[var(--bg-soft)] rounded-ui-md p-3 border border-[var(--line)]">
            {itemStaffDetails.length > 0 ? (
              <div className="space-y-2">
                {Array.from(new Set(itemStaffDetails.map((item) => item.staffName))).map(
                  (staffName, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-[var(--text-primary)]">{staffName}</span>
                      <span className="text-xs text-[var(--text-muted)]">Assigned therapist</span>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">No staff assigned</p>
            )}
          </div>
        </FormSection>

        <FormSection title="Bills">
          <div className="bg-[var(--bg-soft)] rounded-ui-md p-3 space-y-2 border border-[var(--line)]">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-secondary)]">Cashier</span>
              <Button size="sm" variant="ghost">
                Add
              </Button>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--text-secondary)]">Quantity</span>
              <span className="font-bold text-[var(--text-primary)]">
                {transaction.items?.length || 0}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--text-secondary)]">Subtotal</span>
              <span className="font-bold text-[var(--text-primary)]">
                ${transaction.amount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-[var(--line)]">
              <span className="text-base font-bold text-[var(--text-primary)]">Total</span>
              <span className="text-lg font-black text-[var(--brand)]">
                ${transaction.amount.toFixed(2)}
              </span>
            </div>
          </div>
        </FormSection>

        <FormSection title="Payment">
          <div className="bg-[var(--bg-soft)] rounded-ui-md p-3 border border-[var(--line)]">
            {showEditPayment && onUpdate ? (
              <div className="space-y-3">
                <Field id="txn-payment-method" label="Payment method">
                  {paymentMethods.length > 0 ? (
                    <select
                      id="txn-payment-method"
                      value={editedPaymentMethod}
                      onChange={(e) => setEditedPaymentMethod(e.target.value)}
                      className={fieldControlClassName}
                    >
                      {paymentMethods.map((pm) => (
                        <option key={pm} value={pm}>
                          {pm}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="txn-payment-method"
                      type="text"
                      value={editedPaymentMethod}
                      onChange={(e) => setEditedPaymentMethod(e.target.value)}
                      placeholder="Payment method"
                      className={fieldControlClassName}
                    />
                  )}
                </Field>
                <p className="text-xs text-[var(--text-muted)]">${transaction.amount.toFixed(2)}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSavePayment} disabled={savingPayment}>
                    {savingPayment ? 'Saving…' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setShowEditPayment(false);
                      setEditedPaymentMethod(transaction.paymentMethod ?? '');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {transaction.paymentMethod || 'Not specified'}
                  </span>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    ${transaction.amount.toFixed(2)}
                  </p>
                </div>
                {onUpdate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowEditPayment(true);
                      setEditedPaymentMethod(transaction.paymentMethod ?? '');
                    }}
                  >
                    Edit
                  </Button>
                )}
              </div>
            )}
          </div>
        </FormSection>

        <FormSection title="Remarks">
          {onUpdate ? (
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              onBlur={handleSaveRemarks}
              placeholder="No remarks"
              className={`${fieldControlClassName} h-auto min-h-[4.5rem] py-3 resize-none`}
              rows={2}
            />
          ) : (
            <div className="bg-[var(--bg-soft)] rounded-ui-md p-3 border border-[var(--line)]">
              <p className="text-sm text-[var(--text-secondary)]">{remarks || 'No remarks'}</p>
            </div>
          )}
        </FormSection>

        {transaction.status === 'voided' && (
          <div className="w-full py-3 bg-[var(--bg-soft)] text-[var(--text-secondary)] font-bold text-sm rounded-ui-md text-center border border-[var(--line)]">
            This transaction has been voided
          </div>
        )}
      </AppModal>

      <ConfirmationDialog
        open={showVoidConfirm}
        onClose={() => setShowVoidConfirm(false)}
        onConfirm={handleVoidConfirm}
        title="Void Order"
        description={voidDescription}
        confirmLabel="Void Order"
        tone="danger"
        busy={isVoiding}
      />
    </>
  );
};

export default TransactionDetailModal;
