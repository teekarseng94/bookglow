import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../../components/Layout';
import { InventoryEditPanel } from '../../components/inventory/InventoryEditPanel';
import { FormGrid, OverlayTabs, PageHeader, ScrollTable } from '../../components/ui';
import '../../index.css';

const Harness = () => {
  const [tab, setTab] = useState<'details' | 'pricing' | 'availability' | 'media'>('details');
  return (
    <Layout
      activeTab="menu"
      setActiveTab={() => undefined}
      isAdmin
      shopName="SOHOKAKI WELLNESS CENTER"
      outletName="SOHOKAKI WELLNESS CENTER"
      role="admin"
    >
      <div className="m-page-stack">
        <PageHeader
          className="m-page-header--compact m-page-header--app-owned"
          title="Menu & Inventory"
          description="Catalog layout harness for drawer, tabs, and tables."
          actions={<button type="button" className="m-btn m-btn--md">Add Item</button>}
        />
        <ScrollTable label="Catalog items">
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Duration</th>
                <th>Status</th>
                <th className="text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Aromatherapy massage with hot stone add-on</td>
                <td>Massage</td>
                <td>90 min</td>
                <td>Active</td>
                <td className="text-right">RM 1,234,567.89</td>
              </tr>
            </tbody>
          </table>
        </ScrollTable>
      </div>
      <InventoryEditPanel open title="Edit Service" onClose={() => undefined}>
        <OverlayTabs
          ariaLabel="Edit sections"
          value={tab}
          onChange={(id) => setTab(id as typeof tab)}
          items={[
            { id: 'details', label: 'Details' },
            { id: 'pricing', label: 'Pricing' },
            { id: 'availability', label: 'Availability' },
            { id: 'media', label: 'Media' },
          ]}
        />
        {tab === 'details' && (
          <FormGrid className="gap-6">
            <label className="m-settings-label block">
              Name
              <input className="m-settings-control mt-1 w-full" defaultValue="Aromatherapy massage with hot stone add-on" />
            </label>
            <label className="m-settings-label block">
              Description
              <textarea className="m-settings-control mt-1 w-full min-h-[8rem]" defaultValue="Relaxing full-body treatment." />
            </label>
          </FormGrid>
        )}
        {tab === 'pricing' && (
          <FormGrid className="gap-6">
            <label className="m-settings-label block">
              Price ($)
              <input className="m-settings-control mt-1 w-full" defaultValue="1234567.89" />
            </label>
            <label className="m-settings-label block">
              Free Point (Loyalty)
              <input className="m-settings-control mt-1 w-full" defaultValue="37" />
            </label>
            <label className="m-settings-label block">
              Commission Eligible
              <input type="checkbox" className="mt-2" defaultChecked />
            </label>
            <label className="m-settings-label block">
              Redeem Point
              <input className="m-settings-control mt-1 w-full" defaultValue="3" />
            </label>
          </FormGrid>
        )}
        <p className="text-sm text-[var(--text-secondary)]">
          Validation: duration is required for this service.
        </p>
      </InventoryEditPanel>
    </Layout>
  );
};

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/services']}>
    <Harness />
  </MemoryRouter>,
);
