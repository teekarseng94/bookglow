import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../../components/Layout';
import Finance from '../../pages/Finance';
import { TransactionType, type Transaction } from '../../types';
import '../../index.css';

const currentDescriptions = [
  'Commission: Foot Massage 60mins',
  'Commission: Aromatherapy Treatment',
  'Commission: Reflexology 45mins',
  'Commission: Deep Tissue Massage',
  'Commission: Wellness Package',
];
const currentAmounts = [35, 39, 31.2, 29, 39, ...Array.from({ length: 55 }, () => 46), 48.3];

const currentExpenses: Transaction[] = currentAmounts.map((amount, index) => ({
  id: `commission-${index + 1}`,
  outletID: 'visual-outlet',
  date: new Date(2026, 8, 10 - (index % 10), 15, 18 - (index % 12)).toISOString(),
  type: TransactionType.EXPENSE,
  amount,
  category: index < 5 ? 'Commission' : index % 3 === 0 ? 'Supplies' : 'Utilities',
  description: currentDescriptions[index] || `${index % 3 === 0 ? 'Cleaning supplies' : 'Business expense'} ${index + 1}`,
  parentSaleId: index < 5 ? `sale-${index + 1}` : undefined,
  paymentMethod: index < 5 ? undefined : 'Cash',
  remarks: index === 7 ? 'Weekly linen and treatment-room supplies.' : undefined,
  createdAt: new Date(2026, 8, 10 - (index % 10), 15, 20 - (index % 12)).toISOString(),
}));

const previousExpenses: Transaction[] = Array.from({ length: 170 }, (_, index) => ({
  id: `previous-${index + 1}`,
  outletID: 'visual-outlet',
  date: new Date(2026, 7, 1 + (index % 28), 12, index % 60).toISOString(),
  type: TransactionType.EXPENSE,
  amount: index === 169 ? 44.82 : 45.34,
  category: 'Supplies',
  description: `August operating expense ${index + 1}`,
}));

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Layout
        activeTab="finance"
        setActiveTab={() => undefined}
        isAdmin
        shopName="SOHOKAKI WELLNESS CENTER"
        outletName="SOHOKAKI WELLNESS CENTER"
        role="admin"
      >
        <Finance
          transactions={[...currentExpenses, ...previousExpenses]}
          onAddTransaction={() => undefined}
          onDeleteTransaction={() => undefined}
          expenseCategories={['Rent', 'Supplies', 'Utilities', 'Marketing', 'Payroll', 'Commission', 'Other']}
          onAddCategory={() => undefined}
          onDeleteCategory={() => undefined}
          isDeleteLocked={false}
        />
      </Layout>
    </BrowserRouter>
  </React.StrictMode>,
);
