
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { Icons } from '../constants';
import MobileFinanceOverview from '../components/finance/MobileFinanceOverview';
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
      <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-surface)] rounded-ui-lg border border-[var(--line)] shadow-ui-xs text-center px-6">
        <div className="w-20 h-20 bg-[var(--danger-soft)] text-[var(--danger)] rounded-full flex items-center justify-center mb-6">
          <Icons.Lock />
        </div>
        <h2 className="text-app-page sm:text-app-page-lg font-bold tracking-tight text-[var(--text)] mb-2">Access Restricted</h2>
        <p className="text-[var(--text-muted)] max-w-sm">Viewing financial reports and recording expenses requires an administrator permission level.</p>
        <div className="mt-8 p-4 bg-[var(--bg-soft)] rounded-ui-md border border-[var(--line-soft)] flex items-center gap-3 text-left">
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
      <MobileFinanceOverview
        expenses={expenseHistory}
        categories={expenseCategories}
        onOpenCategories={() => setShowCategoryModal(true)}
        onRecordExpense={() => setShowExpenseModal(true)}
        onDeleteExpense={onDeleteTransaction}
      />

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
            <Field id="expense-amount" label="Amount (RM)" required>
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
