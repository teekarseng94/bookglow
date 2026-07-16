import React from 'react';
import { StatusBadge, type StatusTone } from '../ui/StatusBadge';

export type StaffStatusKind = 'active' | 'earning' | 'idle';

export interface StaffStatusBadgeProps {
  status?: StaffStatusKind;
  className?: string;
}

const label: Record<StaffStatusKind, string> = {
  active: 'Active',
  earning: 'Earning',
  idle: 'No sales',
};

const tone: Record<StaffStatusKind, StatusTone> = {
  active: 'brand',
  earning: 'success',
  idle: 'neutral',
};

/** Roster status chip — presentation only; parent chooses status from existing stats. */
export const StaffStatusBadge: React.FC<StaffStatusBadgeProps> = ({
  status = 'active',
  className,
}) => (
  <StatusBadge tone={tone[status]} className={className}>
    {label[status]}
  </StatusBadge>
);

export default StaffStatusBadge;
