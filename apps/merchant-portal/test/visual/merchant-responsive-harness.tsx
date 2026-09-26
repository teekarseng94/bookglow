import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../../components/Layout';
import { InventoryEditPanel } from '../../components/inventory/InventoryEditPanel';
import { FormGrid, OverlayTabs, PageHeader, ScrollTable } from '../../components/ui';
import '../../src/loadStyles';

const Harness = () => {
  const [tab, setTab] = useState<'details' | 'pricing' | 'availability' | 'media'>('details');
  const title = (
    <span className="block min-w-0">
      <span className="m-editor-eyebrow">Add New Service</span>
      <span className="m-editor-heading truncate">Untitled</span>
    </span>
  );
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
      <InventoryEditPanel open title={title} onClose={() => undefined}>
        <form id="inventory-edit-form" className="m-inventory-editor m-editor-form">
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
            className="m-editor-tabs"
          />
          {tab === 'details' && (
            <FormGrid>
              <div className="m-editor-stack">
                <label className="m-settings-label block">
                  Name
                  <input className="m-settings-control mt-1 w-full" defaultValue="Aromatherapy massage with hot stone add-on" />
                </label>
                <label className="m-settings-label block">
                  Category
                  <select className="m-settings-control mt-1 w-full" defaultValue="Massage">
                    <option>Massage</option>
                  </select>
                </label>
                <label className="m-settings-label block">
                  Duration (Mins)
                  <input className="m-settings-control mt-1 w-full" defaultValue="60" />
                </label>
              </div>
              <label className="m-settings-label block">
                Description
                <textarea className="m-settings-control m-editor-textarea mt-1 w-full" defaultValue="Relaxing full-body treatment." />
              </label>
            </FormGrid>
          )}
          {tab === 'pricing' && (
            <FormGrid>
              <label className="m-settings-label block">
                Price ($)
                <input className="m-settings-control mt-1 w-full" defaultValue="0" />
              </label>
              <label className="m-settings-label block">
                Free Point (Loyalty)
                <input className="m-settings-control mt-1 w-full" defaultValue="0" />
              </label>
              <label className="m-editor-card flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked />
                <span className="m-settings-label">Commission Eligible</span>
              </label>
              <div className="m-editor-card">
                <p className="m-settings-label uppercase">Redeem Point</p>
                <p className="m-settings-hint">Allow this service to be redeemed for free with member points.</p>
                <label className="m-settings-label block">
                  Item Point Value
                  <input className="m-settings-control mt-1 w-full" defaultValue="0" />
                </label>
              </div>
            </FormGrid>
          )}
          {tab === 'availability' && (
            <div className="m-editor-card">
              <p className="m-settings-label uppercase">Show on Booking Page</p>
              <p className="m-settings-hint">When off, this service is hidden from the customer booking page but still available in POS.</p>
            </div>
          )}
          {tab === 'media' && (
            <FormGrid>
              <div className="m-editor-card flex items-center justify-center min-h-[8rem]">Media preview</div>
              <div className="m-editor-card">
                <p className="m-settings-label uppercase">Photo Library</p>
                <p className="m-settings-hint">Upload image or choose a preset icon.</p>
              </div>
            </FormGrid>
          )}
        </form>
      </InventoryEditPanel>
    </Layout>
  );
};

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/services']}>
    <Harness />
  </MemoryRouter>,
);
