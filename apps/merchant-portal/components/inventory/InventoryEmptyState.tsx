import React from 'react';
import { EmptyState } from '../ui/EmptyState';
import { cx } from '../ui/cx';

export interface InventoryEmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const InventoryEmptyState: React.FC<InventoryEmptyStateProps> = ({
  title = 'No items found',
  description = 'Try changing the category or search.',
  action,
  className,
}) => (
  <EmptyState className={cx(className)} title={title} description={description} action={action} />
);

export default InventoryEmptyState;
