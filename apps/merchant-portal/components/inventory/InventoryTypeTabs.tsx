import React from 'react';
import { cx } from '../ui/cx';

export type InventoryCatalogTab = 'services' | 'products' | 'packages';

export interface InventoryTypeTabsProps {
  activeTab: InventoryCatalogTab;
  onChange: (tab: InventoryCatalogTab) => void;
  className?: string;
}

const TABS: { id: InventoryCatalogTab; label: string }[] = [
  { id: 'services', label: 'Services' },
  { id: 'products', label: 'Products' },
  { id: 'packages', label: 'Packages' },
];

export const InventoryTypeTabs: React.FC<InventoryTypeTabsProps> = ({
  activeTab,
  onChange,
  className,
}) => (
  <div
    className={cx(
      'inline-flex p-1 rounded-ui-sm bg-[var(--bg-soft)] border border-[var(--line)]',
      className,
    )}
    role="tablist"
    aria-label="Catalog type"
  >
    {TABS.map((tab) => (
      <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={activeTab === tab.id}
        onClick={() => onChange(tab.id)}
        className={cx(
          'px-3 py-1.5 rounded-md text-xs font-bold transition-colors',
          activeTab === tab.id
            ? 'bg-[var(--bg-surface)] text-[var(--brand)] shadow-ui-xs'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
        )}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default InventoryTypeTabs;
