import React from 'react';
import { Package, ShoppingBag, Sparkles } from 'lucide-react';
import { cx } from '../ui/cx';

export type InventoryCatalogTab = 'services' | 'products' | 'packages';

export interface InventoryTypeTabsProps {
  activeTab: InventoryCatalogTab;
  onChange: (tab: InventoryCatalogTab) => void;
  className?: string;
}

const TABS: {
  id: InventoryCatalogTab;
  label: string;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}[] = [
  { id: 'services', label: 'Services', Icon: Sparkles },
  { id: 'products', label: 'Products', Icon: ShoppingBag },
  { id: 'packages', label: 'Packages', Icon: Package },
];

export const InventoryTypeTabs: React.FC<InventoryTypeTabsProps> = ({
  activeTab,
  onChange,
  className,
}) => (
  <div
    className={cx(
      'm-inventory-tabs inline-flex w-full md:w-auto p-1 rounded-ui-sm bg-[var(--bg-soft)] border border-[var(--line)]',
      className,
    )}
    role="tablist"
    aria-label="Catalog type"
  >
    {TABS.map(({ id, label, Icon }) => {
      const selected = activeTab === id;
      return (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={selected}
          onClick={() => onChange(id)}
          className={cx(
            'm-inventory-tabs__btn px-3 py-1.5 rounded-md transition-colors focus-visible:shadow-ui-focus-strong',
            selected
              ? 'bg-[var(--brand-soft)] text-[var(--brand)] md:bg-[var(--bg-surface)] md:shadow-ui-xs'
              : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
          )}
        >
          <Icon className="h-4 w-4 shrink-0 md:hidden" aria-hidden />
          <span className="truncate">{label}</span>
        </button>
      );
    })}
  </div>
);

export default InventoryTypeTabs;
