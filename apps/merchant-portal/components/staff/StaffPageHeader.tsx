import React from 'react';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { cx } from '../ui/cx';

export interface StaffPageHeaderProps {
  title?: string;
  description?: string;
<<<<<<< HEAD
  periodControls?: React.ReactNode;
=======
  liveBadge?: boolean;
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
  onAddStaff: () => void;
  onOpenRoleRates: () => void;
  addDisabled?: boolean;
  ratesDisabled?: boolean;
  locked?: boolean;
  className?: string;
}

export const StaffPageHeader: React.FC<StaffPageHeaderProps> = ({
  title = 'Staff & Team',
<<<<<<< HEAD
  description = 'Roster, performance, and commission settings.',
  periodControls,
=======
  description = 'Manage your team, roles, permissions, and performance.',
  liveBadge = true,
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
  onAddStaff,
  onOpenRoleRates,
  addDisabled,
  ratesDisabled,
  locked,
  className,
}) => (
<<<<<<< HEAD
  <div className={cx('space-y-3', className)}>
    <PageHeader
      title={title}
      description={description}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onOpenRoleRates} disabled={ratesDisabled}>
            {locked ? 'Locked' : 'Role Rates'}
          </Button>
          <Button variant="primary" onClick={onAddStaff} disabled={addDisabled}>
            {locked ? 'Locked' : 'Add Staff'}
=======
  <div className={cx(className)}>
    <PageHeader
      className="!pb-3 sm:!pb-4"
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          <span>{title}</span>
          {liveBadge ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
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
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
          </Button>
        </div>
      }
    />
<<<<<<< HEAD
    {periodControls ? <div className="flex flex-wrap items-center gap-2">{periodControls}</div> : null}
=======
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
  </div>
);

export default StaffPageHeader;
