import React from 'react';
import { DenseEntityRow } from '../ui/DenseEntityRow';
import { IconButton } from '../ui/IconButton';
import { InventoryStatusBadge } from './InventoryStatusBadge';
import { cx } from '../ui/cx';

export interface InventoryEntityCardProps {
  thumbnail?: React.ReactNode;
  name: string;
  category: string;
  priceLabel: string;
  metaLabel: string;
  visible?: boolean;
  lowStock?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  actionsDisabled?: boolean;
  className?: string;
}

/**
 * Mobile dense card: thumbnail, name, category/type, price, stock/duration, status, overflow actions.
 */
export const InventoryEntityCard: React.FC<InventoryEntityCardProps> = ({
  thumbnail,
  name,
  category,
  priceLabel,
  metaLabel,
  visible,
  lowStock,
  onEdit,
  onDelete,
  actionsDisabled,
  className,
}) => (
  <div className={cx('rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)] overflow-hidden', className)}>
    <DenseEntityRow
      leading={thumbnail}
      title={name}
      subtitle={`${category} · ${metaLabel}`}
      meta={priceLabel}
      trailing={
        <div className="flex items-center gap-1">
          <InventoryStatusBadge visible={visible} lowStock={lowStock} />
          {onEdit ? (
            <IconButton label="Edit" size="sm" disabled={actionsDisabled} onClick={onEdit}>
              ✎
            </IconButton>
          ) : null}
          {onDelete ? (
            <IconButton label="Delete" size="sm" disabled={actionsDisabled} onClick={onDelete}>
              ×
            </IconButton>
          ) : null}
        </div>
      }
    />
  </div>
);

export default InventoryEntityCard;
