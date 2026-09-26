import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import OnboardingShell from '../../../customer-site/apps/merchant-onboarding/components/OnboardingShell';
import { PREVIOUS_SOFTWARE, BUSINESS_CATEGORIES } from '../../../customer-site/apps/merchant-onboarding/onboardingSteps';
import Layout from '../../components/Layout';
import { SettingsNavigation, type SettingsSectionId } from '../../components/settings/SettingsNavigation';
import { OperatingHoursRow } from '../../components/settings/OperatingHoursRow';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { InventoryTypeTabs } from '../../components/inventory/InventoryTypeTabs';
import { InventoryEmptyState } from '../../components/inventory/InventoryEmptyState';
import { POSCatalogueEmptyState, POSCatalogueToolbar } from '../../components/pos';
import { POSStickyCartAction } from '../../components/pos/POSStickyCartAction';
import '../../index.css';

const screen = new URLSearchParams(window.location.search).get('screen') || 'onboarding';

function OnboardingHarness() {
  const [selected, setSelected] = useState('');
  const [address, setAddress] = useState('');
  const step = new URLSearchParams(window.location.search).get('step') || 'software';
  const canContinue = step === 'software' || address.trim().length >= 4 || selected.length > 0;
  const footer = (
    <>
      {!canContinue ? <p className="merchant-onboarding__hint" role="status">Complete the required field to continue.</p> : null}
      {step === 'software' ? <p className="merchant-onboarding__hint">This step is optional. You can continue without choosing software.</p> : null}
      <button type="button" className="merchant-onboarding__continue" disabled={!canContinue}>Continue <span aria-hidden>→</span></button>
    </>
  );
  return (
    <OnboardingShell progress={70} canGoBack onBack={() => undefined} onSaveExit={() => undefined} saving={false} footer={footer}>
      <section className="merchant-onboarding__content">
        <p className="merchant-onboarding__eyebrow">Account setup</p>
        {step === 'software' ? (
          <>
            <h1>Which software are you currently using?</h1>
            <p className="merchant-onboarding__description">This is optional and helps us understand your setup.</p>
            <div className="merchant-onboarding__software" role="radiogroup">
              {PREVIOUS_SOFTWARE.map((software) => (
                <label key={software}>
                  <input type="radio" name="software" checked={selected === software} onChange={() => setSelected(software)} />
                  <span>{software}</span>
                </label>
              ))}
            </div>
          </>
        ) : null}
        {step === 'location' ? (
          <>
            <h1>Set your venue’s physical location</h1>
            <p className="merchant-onboarding__description">Add your primary business location so clients can easily find you.</p>
            <label className="merchant-onboarding__field">
              Where is your business located?
              <textarea rows={3} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Full business address" />
            </label>
            <div className="merchant-onboarding__map-fallback">Enter an address to preview its location on the map.</div>
          </>
        ) : null}
        {step === 'categories' ? (
          <>
            <h1>Select categories that best describe your business</h1>
            <p className="merchant-onboarding__description">Choose one primary category and up to three related categories.</p>
            <div className="merchant-onboarding__category-grid">
              {BUSINESS_CATEGORIES.map((category) => (
                <button type="button" key={category} className={selected === category ? 'is-selected' : ''} onClick={() => setSelected(category)}>
                  <span aria-hidden>✦</span>
                  <strong>{category}</strong>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </OnboardingShell>
  );
}

function SettingsHarness() {
  const [active, setActive] = useState<SettingsSectionId>('business-profile');
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return (
    <Layout activeTab="settings" setActiveTab={() => undefined} isAdmin shopName="Fiola" outletName="Fiola" role="admin">
      <div className="m-page-with-bottom-nav min-w-0 overflow-x-hidden">
        <SettingsNavigation activeId={active} onSelect={setActive} />
        <section className="m-card mt-4 p-4 min-w-0">
          <label className="m-settings-label block">Shop name</label>
          <input className="m-settings-control" defaultValue="Fiola" />
          <p className="m-settings-desc mt-2 text-xs text-[var(--text-muted)]">
            Name shown in the sidebar, invoices, and browser title.
          </p>
          <button type="button" className="m-btn m-btn--md mt-3">Save outlet details</button>
        </section>
        <section id="settings-operating-hours" className="m-card m-settings-section m-hours-section mt-4 min-w-0 !p-0">
          <h2 className="m-settings-row m-settings-title px-4 py-3 text-base font-bold">Operating hours</h2>
          <div className="m-settings-section-body">
            <div className="m-hours-panel m-settings-list">
              {days.map((day) => (
                <OperatingHoursRow
                  key={day}
                  day={day}
                  openTime="09:00"
                  closeTime="17:00"
                  isOpen
                  onChangeOpenTime={() => undefined}
                  onChangeCloseTime={() => undefined}
                  onToggleOpen={() => undefined}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

function SalesHarness() {
  const chips = ['All', 'Sales', 'Commission', 'Expense'];
  const [filter, setFilter] = useState('All');
  return (
    <Layout activeTab="transactions" setActiveTab={() => undefined} isAdmin shopName="Fiola" outletName="Fiola" role="admin">
      <div className="m-page-with-bottom-nav min-w-0 overflow-x-hidden space-y-3">
        <div className="flex min-w-0 items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search transactions</span>
            <input className="h-12 w-full rounded-ui-md border border-[var(--line)] pl-3" placeholder="Search transactions" />
          </label>
          <button type="button" className="grid h-12 w-12 shrink-0 place-items-center rounded-ui-md border" aria-label="Sort and filter transactions">☰</button>
        </div>
        <div className="no-scrollbar flex min-w-0 max-w-full gap-2 overflow-x-auto" role="toolbar" aria-label="Transaction type filters">
          {chips.map((chip) => (
            <button key={chip} type="button" aria-pressed={filter === chip} onClick={() => setFilter(chip)} className={`min-h-11 shrink-0 rounded-full border px-4 text-xs font-bold ${filter === chip ? 'bg-[var(--brand)] text-white' : ''}`}>
              {chip}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-ui-md border p-3"><p className="text-[11px]">Total In</p><p>+RM0</p></div>
          <div className="rounded-ui-md border p-3"><p className="text-[11px]">Total Out</p><p>-RM0</p></div>
          <div className="rounded-ui-md border p-3"><p className="text-[11px]">Net</p><p>RM0</p></div>
        </div>
        <EmptyState
          title="No transactions yet"
          description="Completed sales and expenses will appear here."
          action={<Button variant="primary">Go to POS</Button>}
        />
      </div>
    </Layout>
  );
}

function PosHarness() {
  return (
    <Layout activeTab="pos" setActiveTab={() => undefined} isAdmin shopName="Fiola" outletName="Fiola" role="admin">
      <div className="m-page-with-sticky-action m-pos-page min-w-0 overflow-x-hidden space-y-3">
        <POSCatalogueToolbar
          search=""
          onSearchChange={() => undefined}
          activeCatalog="all"
          onCatalogChange={() => undefined}
          sortBy="a-z"
          onSortChange={() => undefined}
          categories={['All']}
          selectedCategory="All"
          onCategoryChange={() => undefined}
        />
        <POSCatalogueEmptyState kind="no-catalog" onClearFilters={() => undefined} onGoToMenu={() => undefined} />
        <POSStickyCartAction itemCount={0} totalLabel="RM 0.00" onOpen={() => undefined} />
      </div>
    </Layout>
  );
}

function InventoryHarness() {
  const [tab, setTab] = useState<'services' | 'products' | 'packages'>('services');
  return (
    <Layout activeTab="menu" setActiveTab={() => undefined} isAdmin shopName="Fiola" outletName="Fiola" role="admin">
      <div className="m-page-with-bottom-nav min-w-0 overflow-x-hidden space-y-3">
        <InventoryTypeTabs activeTab={tab} onChange={setTab} />
        <div className="flex min-w-0 items-center gap-2">
          <input className="h-11 min-w-0 flex-1 rounded-ui-md border border-[var(--line)] px-3" placeholder="Search services..." aria-label="Search services" />
          <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-ui-md border" aria-label="Filter inventory">☰</button>
          <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-ui-md border" aria-label="Sort inventory">↕</button>
        </div>
        <InventoryEmptyState
          title="No services yet"
          description="Add a service to sell it in POS and bookings."
          action={<Button variant="primary">Add Service</Button>}
        />
        <button type="button" className="m-inventory-fab md:hidden" aria-label="Add Service">+ Add Service</button>
      </div>
    </Layout>
  );
}

function Harness() {
  const view = useMemo(() => screen, []);
  const initial =
    view === 'sales'
      ? '/transactions'
      : view === 'settings'
        ? '/settings'
        : view === 'pos'
          ? '/pos'
          : view === 'inventory'
            ? '/menu'
            : '/onboarding';
  return (
    <MemoryRouter initialEntries={[initial]}>
      {view === 'settings' ? (
        <SettingsHarness />
      ) : view === 'sales' ? (
        <SalesHarness />
      ) : view === 'pos' ? (
        <PosHarness />
      ) : view === 'inventory' ? (
        <InventoryHarness />
      ) : (
        <OnboardingHarness />
      )}
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
