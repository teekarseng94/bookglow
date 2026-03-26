
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction, TransactionType } from '../types';
import { Icons } from '../constants';

interface FinanceProps {
  transactions: Transaction[];
  onAddTransaction: (txn: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  expenseCategories: string[];
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  isLocked?: boolean;
}

const Finance: React.FC<FinanceProps> = ({ 
  transactions, 
  onAddTransaction, 
  onDeleteTransaction,
  expenseCategories,
  onAddCategory,
  onDeleteCategory,
  isLocked
}) => {
  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm text-center px-6">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-rose-100">
          <Icons.Lock />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Access Restricted</h2>
        <p className="text-slate-400 max-w-sm">Viewing financial reports and recording expenses requires an administrator permission level.</p>
        <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 text-left">
           <div className="text-teal-600 shrink-0"><Icons.Settings /></div>
           <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Please contact your manager to elevate your permissions in the System Settings.</p>
        </div>
      </div>
    );
  }

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newExpense, setNewExpense] = useState({ 
    description: '', 
    amount: '', 
    category: expenseCategories[0] || 'Other', 
    date: new Date().toISOString().split('T')[0] 
  });

  const chartData = useMemo(() => {
    const monthlyData: { [key: string]: any } = {};
    const now = new Date();
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const fullKey = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyData[fullKey] = { 
        month: d.toLocaleString('default', { month: 'short' }), 
        income: 0, 
        expenses: 0, 
        timestamp: d.getTime() 
      };
    }
    
    transactions.forEach(txn => {
      const d = new Date(txn.date);
      const fullKey = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthlyData[fullKey]) {
        if (txn.type === TransactionType.SALE) monthlyData[fullKey].income += txn.amount;
        else monthlyData[fullKey].expenses += txn.amount;
      }
    });
    return Object.values(monthlyData).sort((a: any, b: any) => a.timestamp - b.timestamp);
  }, [transactions]);

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;
    
    onAddTransaction({ 
      id: `exp_${Date.now()}`, 
      date: new Date(newExpense.date).toISOString(), 
      type: TransactionType.EXPENSE, 
      amount: parseFloat(newExpense.amount), 
      category: newExpense.category, 
      description: newExpense.description 
    });

    setNewExpense({ 
      description: '', 
      amount: '', 
      category: expenseCategories[0] || 'Other', 
      date: new Date().toISOString().split('T')[0] 
    });
    setShowExpenseModal(false);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
    }
  };

  const expenseHistory = useMemo(() => {
    return transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 leading-tight">Financial Records</h2>
          <p className="text-slate-500 text-sm font-medium">Track your daily income and expenditures</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowCategoryModal(true)} 
            className="px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all border shadow-sm bg-white border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95"
          >
            <Icons.Settings /> Categories
          </button>
          <button 
            onClick={() => setShowExpenseModal(true)} 
            className="px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg bg-rose-600 text-white hover:bg-rose-700 active:scale-95 shadow-rose-100"
          >
            <Icons.Add /> Record Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Analytics Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
            <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
              <Icons.Finance /> Cashflow Overview
            </h3>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="income" name="Revenue" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={32} />
                <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
               <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Expense Ledger</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-bold bg-slate-50/50">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenseHistory.map(txn => (
                    <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">{new Date(txn.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">{txn.description}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase rounded-md">
                          {txn.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-rose-600">-${txn.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => onDeleteTransaction(txn.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-2">
                          <Icons.Trash />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {expenseHistory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center opacity-30">
                          <div className="scale-150 mb-4 text-slate-400"><Icons.Finance /></div>
                          <p className="text-sm font-bold italic">No expenses recorded yet.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Categories Sidebar */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-4">Summary by Category</h3>
              <div className="space-y-4">
                 {expenseCategories.map(cat => {
                   const catTotal = expenseHistory.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
                   if (catTotal === 0) return null;
                   return (
                     <div key={cat} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                           <span className="text-sm font-bold text-slate-600">{cat}</span>
                        </div>
                        <span className="text-sm font-black text-slate-800">${catTotal.toLocaleString()}</span>
                     </div>
                   );
                 })}
                 {expenseHistory.length === 0 && <p className="text-xs text-slate-400 italic">No breakdown available.</p>}
              </div>
           </div>
        </div>
      </div>

      {/* Record Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scaleIn overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-rose-600 text-white">
              <h3 className="text-lg font-bold">Record New Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="hover:rotate-90 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmitExpense} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Description</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Monthly Rent, Cleaning Supplies..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                  value={newExpense.description}
                  onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Category</label>
                  <select 
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                    value={newExpense.category}
                    onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                  >
                    {expenseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Amount ($)</label>
                  <input 
                    required
                    type="number" 
                    min="0.01"
                    step="0.01"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-black text-rose-600 text-lg"
                    value={newExpense.amount}
                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Transaction Date</label>
                <input 
                  required
                  type="date" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                  value={newExpense.date}
                  onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                />
              </div>

              <div className="pt-4 flex gap-4">
                 <button 
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                 <button 
                  type="submit" 
                  className="flex-[2] py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  Confirm & Deduct
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scaleIn overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white">
              <h3 className="text-lg font-bold">Manage Expense Categories</h3>
              <button onClick={() => setShowCategoryModal(false)} className="hover:rotate-90 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input 
                  required
                  type="text" 
                  placeholder="New category name..."
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                />
                <button 
                  type="submit"
                  className="p-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
                >
                  <Icons.Add />
                </button>
              </form>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {expenseCategories.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                    <span className="text-sm font-bold text-slate-700">{cat}</span>
                    <button 
                      onClick={() => onDeleteCategory(cat)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
               <button 
                onClick={() => setShowCategoryModal(false)}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
