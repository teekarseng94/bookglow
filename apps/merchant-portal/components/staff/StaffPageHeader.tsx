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
    <PageHeader
      className="m-page-header--compact !pb-3 sm:!pb-4"
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          <span>{title}</span>
          {liveBadge ? (
            <span className="m-staff-card__role inline-flex items-center gap-1.5 bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success-border)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" aria-hidden />
              <span className="sm:hidden">Live</span>
              <span className="hidden sm:inline">Live outlet</span>
            </span>
          ) : null}
        </span>
      }
      description={<span className="hidden sm:inline">{description}</span>}
      actions={
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenRoleRates}
            disabled={ratesDisabled}
            className="flex-1 sm:flex-none"
          >
            {locked ? 'Locked' : (
              <>
                <span className="sm:hidden">Roles</span>
                <span className="hidden sm:inline">View Roles & Permissions</span>
              </>
            )}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onAddStaff}
            disabled={addDisabled}
            className="flex-1 sm:flex-none"
          >
            {locked ? 'Locked' : '+ Add Staff'}
          </Button>
        </div>
      }
    />
  </div>
);

export default StaffPageHeader;
