import React from 'react';
import { StatusBadge, type StatusTone } from '../ui/StatusBadge';
import { cx } from '../ui/cx';

export interface InventoryStatusBadgeProps {
  visible?: boolean;
  lowStock?: boolean;
  label?: string;
  className?: string;
}

export const InventoryStatusBadge: React.FC<InventoryStatusBadgeProps> = ({
  visible,
  lowStock,
  label,
  className,
}) => {
  let tone: StatusTone = 'neutral';
  let text = label || 'Active';
  if (lowStock) {
    tone = 'danger';
    text = label || 'Low stock';
  } else if (visible === false) {
    tone = 'warning';
    text = label || 'Hidden';
  } else if (visible === true) {
    tone = 'success';
    text = label || 'Visible';
  }
  return (
    <StatusBadge tone={tone} className={cx(className)}>
      {text}
    </StatusBadge>
  );
};

export default InventoryStatusBadge;
