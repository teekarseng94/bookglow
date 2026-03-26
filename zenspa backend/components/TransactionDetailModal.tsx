import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Client, Staff } from '../types';
import { Icons } from '../constants';

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
  paymentMethods = []
}) => {
  const [isVoiding, setIsVoiding] = useState(false);
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
    if (transaction.type !== 'SALE' || !transaction.clientId || transaction.clientId === 'guest' || transaction.category === 'Redemption') {
      return 0;
    }
    if (transaction.items && transaction.items.length > 0) {
      return transaction.items.reduce((sum, item) => {
        const itemPoints = item.points !== undefined ? item.points : Math.floor(item.price);
        return sum + (itemPoints * item.quantity);
      }, 0);
    }
    return Math.floor(transaction.amount);
  }, [transaction]);

  const handleVoid = async () => {
    const clientName = client?.name || 'Guest';
    const confirmMessage = pointsToDeduct > 0
      ? `Voiding this order will deduct ${pointsToDeduct.toLocaleString()} points from ${clientName}.\n\nAre you sure you want to void this transaction?`
      : 'Are you sure you want to void this transaction?';

    if (!window.confirm(confirmMessage)) return;

    setIsVoiding(true);
    try {
      await onVoid(transaction.id);
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

  // Staff details per item (for showing which staff handled each line)
  const itemStaffDetails = useMemo(() => {
    if (!transaction.items) return [];
    return transaction.items.map(item => {
      const staffMember = item.staffId ? staff.find(s => s.id === item.staffId) : null;
      return {
        ...item,
        staffName: staffMember?.name || '—'
      };
    });
  }, [transaction.items, staff]);

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 4) return phone;
    return '...' + phone.slice(-4);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto cursor-default p-4 sm:p-5 md:p-6 lg:p-8 bg-slate-900/50 md:bg-slate-900/60 backdrop-blur-sm"
      style={{ touchAction: 'manipulation' }}
      onClick={onClose}
      onTouchEnd={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); onClose(); } }}
      role="presentation"
      aria-label="Close sale detail"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-full sm:max-w-md shadow-2xl animate-scaleIn my-2 sm:my-4 md:my-6 cursor-auto max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-3rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-detail-title"
      >
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-teal-50 to-blue-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            onTouchEnd={(e) => { e.preventDefault(); onClose(); }}
            style={{ touchAction: 'manipulation' }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 active:bg-slate-100 rounded-lg transition-colors p-2 -ml-2"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 id="transaction-detail-title" className="text-lg md:text-xl font-bold text-slate-800">{receiptNumber}</h2>
          <button
            onClick={handlePrint}
            className="text-blue-600 hover:text-blue-700 transition-colors p-2"
            aria-label="Print"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
        </div>

        <div className="p-4 md:p-5 space-y-4 md:space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Member Info */}
          {client && (
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white font-bold text-base md:text-lg flex-shrink-0">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800">{client.name}</p>
                <p className="text-sm text-slate-500">{maskPhone(client.phone)}</p>
              </div>
            </div>
          )}

          {/* Date & Edit */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              {showEditDate ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    className="p-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <input
                    type="time"
                    value={editedTime}
                    onChange={(e) => setEditedTime(e.target.value)}
                    className="p-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={handleSaveDate}
                    className="px-3 py-1 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowEditDate(false)}
                    className="px-3 py-1 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-sm text-slate-600">{formatTimestamp(transaction.date)}</p>
                  {onUpdate && (
                    <button
                      onClick={() => setShowEditDate(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Service/Product Details */}
          <div>
            <h3 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 md:mb-3">SERVICE</h3>
            <div className="space-y-2 md:space-y-3">
              {itemStaffDetails.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 md:p-4 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {item.type === 'service' ? 'S' : item.type === 'product' ? 'P' : 'PKG'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500">Staff: </span>
                        <span className="font-semibold text-slate-700">{item.staffName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Price: </span>
                        <span className="font-bold text-teal-600">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Staff Summary (names only, no commission details) */}
          <div>
            <h3 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 md:mb-3">STAFF</h3>
            <div className="bg-slate-50 rounded-xl p-3 md:p-4">
              {itemStaffDetails.length > 0 ? (
                <div className="space-y-2">
                  {Array.from(new Set(itemStaffDetails.map(item => item.staffName))).map((staffName, idx) => {
                    return (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-800">{staffName}</span>
                        <span className="text-xs text-slate-500">Assigned therapist</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No staff assigned</p>
              )}
            </div>
          </div>

          {/* Bills Summary */}
          <div>
            <h3 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 md:mb-3">BILLS</h3>
            <div className="bg-slate-50 rounded-xl p-3 md:p-4 space-y-2 md:space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Cashier</span>
                <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">Add</button>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Quantity</span>
                <span className="font-bold text-slate-800">{transaction.items?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-bold text-slate-800">${transaction.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t-2 border-slate-200">
                <span className="text-base font-bold text-slate-800">Total</span>
                <span className="text-lg font-black text-teal-600">${transaction.amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <h3 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 md:mb-3">PAYMENT</h3>
            <div className="bg-slate-50 rounded-xl p-3 md:p-4">
              {showEditPayment && onUpdate ? (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-600">Payment method</label>
                  {paymentMethods.length > 0 ? (
                    <select
                      value={editedPaymentMethod}
                      onChange={(e) => setEditedPaymentMethod(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white"
                    >
                      {paymentMethods.map((pm) => (
                        <option key={pm} value={pm}>{pm}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editedPaymentMethod}
                      onChange={(e) => setEditedPaymentMethod(e.target.value)}
                      placeholder="Payment method"
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                    />
                  )}
                  <p className="text-xs text-slate-500">${transaction.amount.toFixed(2)}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSavePayment}
                      disabled={savingPayment}
                      className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
                    >
                      {savingPayment ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowEditPayment(false); setEditedPaymentMethod(transaction.paymentMethod ?? ''); }}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-semibold text-slate-800">{transaction.paymentMethod || 'Not specified'}</span>
                    <p className="text-xs text-slate-500 mt-1">${transaction.amount.toFixed(2)}</p>
                  </div>
                  {onUpdate && (
                    <button
                      type="button"
                      onClick={() => { setShowEditPayment(true); setEditedPaymentMethod(transaction.paymentMethod ?? ''); }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <h3 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 md:mb-3">REMARKS</h3>
            {onUpdate ? (
              <div>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  onBlur={handleSaveRemarks}
                  placeholder="No remarks"
                  className="w-full p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 resize-none text-sm"
                  rows={2}
                />
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl p-3 md:p-4">
                <p className="text-sm text-slate-600">{remarks || 'No remarks'}</p>
              </div>
            )}
          </div>

          {/* Void Order Button */}
          {transaction.status !== 'voided' && (
            <div className="pt-3 md:pt-4 border-t-2 border-slate-200 flex-shrink-0">
              <button
                onClick={handleVoid}
                disabled={isVoiding}
                className="w-full py-3 md:py-4 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold text-sm md:text-base rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isVoiding ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Voiding...
                  </>
                ) : (
                  'Void Order'
                )}
              </button>
            </div>
          )}

          {transaction.status === 'voided' && (
            <div className="pt-3 md:pt-4 border-t-2 border-slate-200 flex-shrink-0">
              <div className="w-full py-3 md:py-4 bg-slate-300 text-slate-600 font-bold text-sm md:text-base rounded-xl text-center">
                This transaction has been voided
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;
