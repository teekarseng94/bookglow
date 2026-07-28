import React from 'react';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { cx } from '../ui/cx';

export interface InventoryPageHeaderProps {
  title?: string;
  description?: string;
  primaryLabel: string;
  onPrimaryAction: () => void;
  primaryDisabled?: boolean;
  secondaryActions?: React.ReactNode;
  className?: string;
}

export const InventoryPageHeader: React.FC<InventoryPageHeaderProps> = ({
  title = 'Menu & Inventory',
  description = 'Manage treatments, retail inventory, and bundled packages.',
  primaryLabel,
  onPrimaryAction,
  primaryDisabled,
  secondaryActions,
  className,
}) => (
  <PageHeader
    className={cx('m-page-header--compact', className)}
    title={title}
    description={description}
    actions={
      <div className="flex flex-wrap items-center gap-2">
        {secondaryActions}
        <Button variant="primary" onClick={onPrimaryAction} disabled={primaryDisabled}>
          {primaryLabel}
        </Button>
      </div>
    }
  />
);

export default InventoryPageHeader;
