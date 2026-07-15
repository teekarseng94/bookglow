import React from 'react';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { cx } from '../ui/cx';

export interface StaffPageHeaderProps {
  title?: string;
  description?: string;
  periodControls?: React.ReactNode;
  onAddStaff: () => void;
  onOpenRoleRates: () => void;
  addDisabled?: boolean;
  ratesDisabled?: boolean;
  locked?: boolean;
  className?: string;
}

export const StaffPageHeader: React.FC<StaffPageHeaderProps> = ({
  title = 'Staff & Team',
  description = 'Roster, performance, and commission settings.',
  periodControls,
  onAddStaff,
  onOpenRoleRates,
  addDisabled,
  ratesDisabled,
  locked,
  className,
}) => (
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
          </Button>
        </div>
      }
    />
    {periodControls ? <div className="flex flex-wrap items-center gap-2">{periodControls}</div> : null}
  </div>
);

export default StaffPageHeader;
