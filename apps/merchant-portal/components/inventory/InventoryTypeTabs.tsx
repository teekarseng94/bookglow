import React from 'react';
import { OverlayTabs } from '../ui/OverlayTabs';
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
  <OverlayTabs
    variant="segmented"
    ariaLabel="Catalog type"
    className={cx('m-inventory-tabs', className)}
    items={TABS}
    value={activeTab}
    onChange={onChange}
  />
);

export default InventoryTypeTabs;
