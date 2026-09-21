import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../../components/Layout';
import POS from '../../pages/POS';
import type { Client, OutletSettings, Service, Staff } from '../../types';
import '../../index.css';

const outletSettings: OutletSettings = {
  shopName: 'SOHOKAKI WELLNESS CENTER',
  isOutletModeEnabled: false,
  isAdminAuthenticated: true,
  lockedFeatures: [],
  paymentMethods: ['Cash', 'Touch n Go', 'Card'],
  reminderEnabled: false,
  reminderTiming: 24,
  reminderChannel: 'Email',
};

const services: Service[] = [
  { id: 's1', outletID: 'o1', name: 'Aromatherapy massage with hot stone add-on', price: 188.9, duration: 90, category: 'Massage', points: 20, isCommissionable: true },
  { id: 's2', outletID: 'o1', name: 'Signature facial', price: 128, duration: 60, category: 'Facial', points: 12, isCommissionable: true },
  { id: 's3', outletID: 'o1', name: 'Foot reflexology', price: 88, duration: 45, category: 'Massage', points: 8, isCommissionable: true },
  { id: 's4', outletID: 'o1', name: 'Body scrub', price: 98.5, duration: 50, category: 'Body', points: 10, isCommissionable: true },
  { id: 's5', outletID: 'o1', name: 'Head spa treatment', price: 158, duration: 75, category: 'Hair', points: 15, isCommissionable: true },
  { id: 's6', outletID: 'o1', name: 'Manicure', price: 45, duration: 30, category: 'Nails', points: 4, isCommissionable: false },
  { id: 's7', outletID: 'o1', name: 'Pedicure', price: 55, duration: 40, category: 'Nails', points: 5, isCommissionable: false },
  { id: 's8', outletID: 'o1', name: 'Deep tissue massage', price: 168, duration: 90, category: 'Massage', points: 18, isCommissionable: true },
  { id: 's9', outletID: 'o1', name: 'Hot oil scalp treatment', price: 118, duration: 50, category: 'Hair', points: 11, isCommissionable: true },
  { id: 's10', outletID: 'o1', name: 'Express manicure', price: 35, duration: 20, category: 'Nails', points: 3, isCommissionable: false },
  { id: 's11', outletID: 'o1', name: 'Couples massage', price: 288, duration: 90, category: 'Massage', points: 28, isCommissionable: true },
  { id: 's12', outletID: 'o1', name: 'Hydrating body wrap', price: 148, duration: 70, category: 'Body', points: 14, isCommissionable: true },
];

const clients: Client[] = [
  {
    id: 'c1',
    outletID: 'o1',
    name: 'Mei Ling',
    email: 'mei@example.test',
    phone: '0123456789',
    notes: '',
    createdAt: '2026-01-01',
    points: 240,
  },
];

const staff: Staff[] = [
  { id: 'st1', outletID: 'o1', name: 'Aisha', role: 'Therapist', phone: '', email: '', createdAt: '2026-01-01' },
  { id: 'st2', outletID: 'o1', name: 'Senior Therapist Alexandra Chen', role: 'Therapist', phone: '', email: '', createdAt: '2026-01-01' },
];

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/pos']}>
    <Layout
      activeTab="pos"
      setActiveTab={() => undefined}
      isAdmin
      shopName={outletSettings.shopName}
      outletName={outletSettings.shopName}
      role="admin"
    >
      <POS
        services={services}
        products={[]}
        packages={[]}
        clients={clients}
        staff={staff}
        roleCommissions={[{ role: 'Therapist', rate: 10 }]}
        onCompleteSale={async () => undefined}
        paymentMethods={outletSettings.paymentMethods}
        outletSettings={outletSettings}
      />
    </Layout>
  </MemoryRouter>,
);
