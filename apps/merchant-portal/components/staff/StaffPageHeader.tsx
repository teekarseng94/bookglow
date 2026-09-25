import React from 'react';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { cx } from '../ui/cx';

export interface StaffPageHeaderProps {
  title?: string;
  description?: string;
  liveBadge?: boolean;
  onAddStaff: () => void;
  onOpenRoleRates: () => void;
  addDisabled?: boolean;
  ratesDisabled?: boolean;
  locked?: boolean;
  className?: string;
}

export const StaffPageHeader: React.FC<StaffPageHeaderProps> = ({
  title = 'Staff & Team',
  description = 'Manage your team, roles, permissions, and performance.',
  liveBadge = true,
  onAddStaff,
  onOpenRoleRates,
  addDisabled,
  ratesDisabled,
  locked,
  className,
}) => (
  <div className={cx(className)}>
    <div className="md:hidden flex gap-2">
      <Button variant="secondary" size="md" onClick={onOpenRoleRates} disabled={ratesDisabled} className="flex-1">
        {locked ? 'Locked' : 'Roles'}
      </Button>
      <Button variant="primary" size="md" onClick={onAddStaff} disabled={addDisabled} className="flex-1">
        {locked ? 'Locked' : 'Add Staff'}
      </Button>
    </div>
    <PageHeader
      className="m-page-header--compact hidden md:flex !pb-4"
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          <span>{title}</span>
          {liveBadge ? (
            <span className="m-staff-card__role inline-flex items-center gap-1.5 bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success-border)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" aria-hidden />
              Live outlet
            </span>
          ) : null}
        </span>
      }
      description={description}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onOpenRoleRates} disabled={ratesDisabled}>
            {locked ? 'Locked' : 'View Roles & Permissions'}
          </Button>
          <Button variant="primary" size="sm" onClick={onAddStaff} disabled={addDisabled}>
            {locked ? 'Locked' : '+ Add Staff'}
          </Button>
        </div>
      }
    />
  </div>
);

export default StaffPageHeader;
