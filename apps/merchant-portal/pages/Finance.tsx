
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction, TransactionType } from '../types';
import { Icons } from '../constants';
import { ReportEmptyState, ReportPageHeader, ReportTxnCard } from '../components/reports';
import {
  AppModal,
  Button,
  Field,
  fieldControlClassName,
  FormSection,
  ModalFooterActions,
} from '../components/ui';

interface FinanceProps {
  transactions: Transaction[];
  onAddTransaction: (txn: Transaction) => void | Promise<void | string | undefined>;
  onDeleteTransaction: (id: string) => void | Promise<void>;
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
        <h2 className="text-app-page sm:text-app-page-lg font-bold tracking-tight text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-400 max-w-sm">Viewing financial reports and recording expenses requires an administrator permission level.</p>
        <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 text-left">
           <div className="text-[var(--brand)] shrink-0"><Icons.Settings /></div>
           <p className="m-finance-locked-hint">Please contact your manager to elevate your permissions in the System Settings.</p>
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
      outletID: '',
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
      <ReportPageHeader
        title="Financial Records"
        description="Track your daily income and expenditures"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCategoryModal(true)}>
              Categories
            </Button>
            <Button type="button" variant="primary" onClick={() => setShowExpenseModal(true)}>
              Record Expense
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Analytics Section — chart supports decisions; below header */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm h-72 sm:h-80">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4 sm:mb-6 flex items-center gap-2">
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
            <div className="p-4 sm:p-6 border-b border-slate-100">
               <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expense Ledger</h3>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2 p-3">
              {expenseHistory.map((txn) => (
                <div key={txn.id} className="relative">
                  <ReportTxnCard
                    amountLabel={`-$${txn.amount.toLocaleString()}`}
                    amountTone="out"
                    customer={txn.description}
                    dateTimeLabel={new Date(txn.date).toLocaleDateString()}
                    paymentMethod={txn.category}
                    statusLabel="Expense"
                    statusTone="danger"
                  />
                  <button
                    type="button"
                    onClick={() => onDeleteTransaction(txn.id)}
                    className="absolute top-2 right-2 min-w-[40px] min-h-[40px] rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                    aria-label={`Delete ${txn.description}`}
                  >
                    <Icons.Trash />
                  </button>
                </div>
              ))}
              {expenseHistory.length === 0 ? (
                <ReportEmptyState title="No expenses recorded yet." description="Record an expense to see it in the ledger." />
              ) : null}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="m-settings-label uppercase tracking-widest bg-slate-50/50">
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
                        <span className="m-inventory-badge bg-[var(--bg-soft)] text-[var(--text-muted)]">
                          {txn.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 m-txn-amount text-rose-600 tabular-nums">-${txn.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => onDeleteTransaction(txn.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-2" aria-label="Delete expense">
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
              <h3 className="m-settings-subhead mb-4">Summary by Category</h3>
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
                        <span className="m-txn-amount text-[var(--text-primary)] tabular-nums">${catTotal.toLocaleString()}</span>
                     </div>
                   );
                 })}
                 {expenseHistory.length === 0 && <p className="text-xs text-slate-400 italic">No breakdown available.</p>}
              </div>
           </div>
        </div>
      </div>

      <AppModal
        open={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title="Record New Expense"
        description="Add an expense to the ledger."
        size="md"
        asForm
        formId="record-expense-form"
        onSubmit={handleSubmitExpense}
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={() => setShowExpenseModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="record-expense-form">
              Confirm & Deduct
            </Button>
          </ModalFooterActions>
        }
      >
        <FormSection>
          <Field id="expense-description" label="Description" required>
            <input
              id="expense-description"
              required
              type="text"
              placeholder="e.g. Monthly Rent, Cleaning Supplies..."
              className={fieldControlClassName}
              value={newExpense.description}
              onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="expense-category" label="Category" required>
              <select
                id="expense-category"
                required
                className={fieldControlClassName}
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
              >
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="expense-amount" label="Amount ($)" required>
              <input
                id="expense-amount"
                required
                type="number"
                min="0.01"
                step="0.01"
                className={`${fieldControlClassName} font-bold tabular-nums text-[var(--danger)]`}
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              />
            </Field>
          </div>
          <Field id="expense-date" label="Transaction Date" required>
            <input
              id="expense-date"
              required
              type="date"
              className={fieldControlClassName}
              value={newExpense.date}
              onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
            />
          </Field>
        </FormSection>
      </AppModal>

      <AppModal
        open={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Manage Expense Categories"
        description="Add or remove categories used when recording expenses."
        size="md"
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>
              Close
            </Button>
          </ModalFooterActions>
        }
      >
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            required
            type="text"
            placeholder="New category name..."
            className={`${fieldControlClassName} flex-1`}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <Button type="submit" aria-label="Add category">
            <Icons.Add />
          </Button>
        </form>
        <div className="space-y-2 mt-4">
          {expenseCategories.map((cat) => (
            <div
              key={cat}
              className="flex items-center justify-between px-3 py-2.5 rounded-ui-sm border border-[var(--line)] bg-[var(--bg-soft)] group"
            >
              <span className="text-sm font-semibold text-[var(--text-primary)]">{cat}</span>
              <button
                type="button"
                onClick={() => onDeleteCategory(cat)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-all"
                aria-label={`Delete ${cat}`}
              >
                <Icons.Trash />
              </button>
            </div>
          ))}
        </div>
      </AppModal>
    </div>
  );
};

export default Finance;
