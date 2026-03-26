
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Client } from '../types';
import { Icons } from '../constants';

interface TransactionsProps {
  transactions: Transaction[];
  clients: Client[];
  onUpdateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  isDeleteLocked?: boolean;
}

type SortField = 'date' | 'amount' | 'client';
type SortOrder = 'asc' | 'desc';

const Transactions: React.FC<TransactionsProps> = ({ 
  transactions, 
  clients, 
  onUpdateTransaction, 
  onDeleteTransaction,
  isDeleteLocked 
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [deletingTxn, setDeletingTxn] = useState<Transaction | null>(null);
  const [expandedTxn, setExpandedTxn] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const sortedAndFilteredTransactions = useMemo(() => {
    const filtered = transactions.filter(t => {
      // Exclude voided sales so Sales History only shows active/deleted sales (voided in Sales Reports = removed from list)
      if ((t as Transaction & { status?: string }).status === 'voided') return false;

      const client = clients.find(c => c.id === t.clientId);
      const clientName = client?.name || (t.type === TransactionType.SALE ? 'Guest' : '');
      
      const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase()) || 
                           t.category.toLowerCase().includes(search.toLowerCase()) ||
                           clientName.toLowerCase().includes(search.toLowerCase());
      
      const matchesType = filterType === 'ALL' || t.type === filterType;
      return matchesSearch && matchesType;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortField === 'client') {
        const clientA = clients.find(c => c.id === a.clientId)?.name || 'Guest';
        const clientB = clients.find(c => c.id === b.clientId)?.name || 'Guest';
        comparison = clientA.localeCompare(clientB);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [transactions, search, filterType, sortField, sortOrder, clients]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTxn) return;
    await onUpdateTransaction(editingTxn.id, {
      date: editingTxn.date,
      description: editingTxn.description,
      amount: editingTxn.amount,
      category: editingTxn.category,
      clientId: editingTxn.clientId,
      paymentMethod: editingTxn.paymentMethod
    });
    setEditingTxn(null);
  };

  // Calculate points that would be deducted for a sale
  const calculatePointsForSale = (txn: Transaction): number => {
    if (txn.type !== TransactionType.SALE || !txn.clientId || txn.clientId === 'guest' || txn.category === 'Redemption') {
      return 0;
    }
    if (txn.items && txn.items.length > 0) {
      return txn.items.reduce((sum, item) => {
        const itemPoints = item.points !== undefined ? item.points : Math.floor(item.price);
        return sum + (itemPoints * item.quantity);
      }, 0);
    }
    return Math.floor(txn.amount);
  };

  const confirmDelete = async () => {
    if (!deletingTxn) return;
    
    const pointsToDeduct = calculatePointsForSale(deletingTxn);
    const client = clients.find(c => c.id === deletingTxn.clientId);
    const clientName = client?.name || 'Guest';
    
    try {
      await onDeleteTransaction(deletingTxn.id);
      setDeletingTxn(null);
      
      // Show success toast
      if (pointsToDeduct > 0) {
        setToastMessage(`Sale deleted and ${pointsToDeduct.toLocaleString()} points deducted from ${clientName}.`);
        setTimeout(() => setToastMessage(null), 5000);
      } else {
        setToastMessage('Sale deleted successfully.');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (error: any) {
      alert(`Failed to delete sale: ${error.message || 'Unknown error'}`);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedTxn(expandedTxn === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 flex items-center gap-3">
        <div className="bg-teal-600 text-white p-2 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <p className="text-teal-800 text-xs font-medium">
          Management Console: Review, edit, or remove historical records to maintain data accuracy.
        </p>
      </div>

      <div className="flex flex-col xl:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="Search description, client, or category..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 shadow-sm transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="absolute left-4 top-3.5 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Show</span>
            <select 
              className="bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-500 shadow-sm transition-all"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">All Records</option>
              <option value={TransactionType.SALE}>Sales Only</option>
              <option value={TransactionType.EXPENSE}>Expenses Only</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sort By</span>
            <select 
              className="bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-500 shadow-sm transition-all"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="client">Client Name</option>
            </select>
            <select 
              className="bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-500 shadow-sm transition-all"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-bold bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date & Time & Description</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedAndFilteredTransactions.map(txn => {
                const client = clients.find(c => c.id === txn.clientId);
                const isExpanded = expandedTxn === txn.id;
                const txnDate = new Date(txn.date);
                
                return (
                  <React.Fragment key={txn.id}>
                    <tr 
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`}
                      onClick={() => toggleExpand(txn.id)}
                    >
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center w-2 h-2 rounded-full ${txn.type === TransactionType.SALE ? 'bg-green-500' : 'bg-rose-500'}`}></span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-500 font-bold">
                            {txnDate.toLocaleDateString()} {txnDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-sm font-bold text-slate-800">{txn.description}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {client ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-teal-50 rounded-full flex items-center justify-center text-[10px] font-bold text-teal-600">
                              {client.name.charAt(0)}
                            </div>
                            {client.name}
                          </div>
                        ) : (txn.type === TransactionType.SALE ? <span className="text-slate-300">Guest</span> : <span className="text-slate-300">—</span>)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-md">{txn.category}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">
                        {txn.paymentMethod || '—'}
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold ${
                        txn.type === TransactionType.SALE ? 'text-green-600' : 'text-rose-600'
                      }`}>
                        {txn.type === TransactionType.SALE ? '+' : '-'}${txn.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3" onClick={e => e.stopPropagation()}>
                          <button 
                            disabled={isDeleteLocked}
                            onClick={() => setEditingTxn(txn)}
                            className={`p-2 rounded-lg transition-all ${
                              isDeleteLocked 
                                ? 'text-slate-200 cursor-not-allowed' 
                                : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50'
                            }`}
                          >
                            {isDeleteLocked ? <Icons.Lock /> : <Icons.Edit />}
                          </button>
                          <button 
                            disabled={isDeleteLocked}
                            onClick={() => setDeletingTxn(txn)}
                            className={`p-2 rounded-lg transition-all ${
                              isDeleteLocked 
                                ? 'text-slate-200 cursor-not-allowed' 
                                : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'
                            }`}
                          >
                            {isDeleteLocked ? <Icons.Lock /> : <Icons.Trash />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {isExpanded && txn.items && txn.items.length > 0 && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="px-12 py-6 border-y border-slate-100">
                          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm max-w-2xl animate-fadeIn">
                             <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Sale Breakdown</h4>
                             <div className="space-y-3">
                               {txn.items.map((item, idx) => (
                                 <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                   <div className="flex flex-col">
                                     <span className="font-semibold text-slate-700">{item.name}</span>
                                     <span className="text-[10px] text-slate-400 uppercase font-bold">{item.type}</span>
                                   </div>
                                   <div className="text-right">
                                     <span className="text-slate-500 font-medium">Qty: {item.quantity}</span>
                                     <span className="ml-6 font-bold text-slate-800">${(item.price * item.quantity).toLocaleString()}</span>
                                   </div>
                                 </div>
                               ))}
                             </div>
                             <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-100">
                               <div className="flex justify-between mb-1">
                                 <span className="text-xs font-bold text-slate-400 uppercase">Payment Method</span>
                                 <span className="text-sm font-black text-slate-600">{txn.paymentMethod || 'Not specified'}</span>
                               </div>
                               <div className="flex justify-between">
                                 <span className="text-xs font-bold text-slate-400 uppercase">Total Transaction Amount</span>
                                 <span className="text-lg font-black text-teal-600">${txn.amount.toLocaleString()}</span>
                               </div>
                             </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {sortedAndFilteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                    No transactions found in history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Transaction Modal */}
      {editingTxn && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-md shadow-2xl animate-scaleIn overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-teal-600 text-white">
              <h3 className="text-lg font-bold">Edit Historical Record</h3>
              <button onClick={() => setEditingTxn(null)} className="hover:rotate-90 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input 
                    required
                    type="date" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                    value={editingTxn.date.split('T')[0]}
                    onChange={e => setEditingTxn({ ...editingTxn, date: new Date(e.target.value).toISOString() })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($)</label>
                  <input 
                    required
                    type="number" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                    value={editingTxn.amount}
                    onChange={e => setEditingTxn({ ...editingTxn, amount: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                  value={editingTxn.description}
                  onChange={e => setEditingTxn({ ...editingTxn, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <input 
                    required
                    type="text" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                    value={editingTxn.category}
                    onChange={e => setEditingTxn({ ...editingTxn, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                    value={editingTxn.paymentMethod || ''}
                    onChange={e => setEditingTxn({ ...editingTxn, paymentMethod: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Link to Client</label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                  value={editingTxn.clientId || ''}
                  onChange={e => setEditingTxn({ ...editingTxn, clientId: e.target.value || undefined })}
                >
                  <option value="">No Client (Guest)</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit" 
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg transition-all"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {deletingTxn && (() => {
        const pointsToDeduct = calculatePointsForSale(deletingTxn);
        const client = clients.find(c => c.id === deletingTxn.clientId);
        const clientName = client?.name || 'Guest';
        const receiptNumber = deletingTxn.id.replace(/\D/g, '').slice(-10) || deletingTxn.id.slice(-8);
        const formattedReceipt = '#' + receiptNumber.padStart(10, '0');
        
        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scaleIn overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icons.Trash />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Transaction?</h3>
                <p className="text-slate-500 text-sm mb-4">
                  Are you sure you want to delete this {deletingTxn.type.toLowerCase()} of <span className="font-bold text-slate-700">${deletingTxn.amount}</span>?
                </p>
                {pointsToDeduct > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                    <p className="text-sm font-semibold text-amber-800 mb-1 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Points Deduction Required
                    </p>
                    <p className="text-xs text-amber-700 mb-2">
                      Deleting this sale will also deduct <span className="font-bold text-amber-900">{pointsToDeduct.toLocaleString()}</span> points from <span className="font-semibold">{clientName}</span>.
                    </p>
                    <p className="text-[10px] text-amber-600 font-mono">
                      Receipt: {formattedReceipt}
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={confirmDelete}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg transition-all"
                  >
                    Yes, Delete{pointsToDeduct > 0 ? ' & Deduct Points' : ''}
                  </button>
                  <button 
                    onClick={() => setDeletingTxn(null)}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl z-[100] animate-fadeIn flex items-center gap-3 max-w-md">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium flex-1">{toastMessage}</p>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default Transactions;
