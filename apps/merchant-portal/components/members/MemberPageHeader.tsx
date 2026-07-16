import React from 'react';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { cx } from '../ui/cx';

export interface MemberPageHeaderProps {
  title?: string;
  description?: string;
  clientCount?: number;
  onAddMember?: () => void;
  addLabel?: string;
  secondaryActions?: React.ReactNode;
  className?: string;
}

export const MemberPageHeader: React.FC<MemberPageHeaderProps> = ({
  title = 'Members',
  description = 'Search, import, and manage your client list.',
  clientCount,
  onAddMember,
  addLabel = 'Add Member',
  secondaryActions,
  className,
}) => (
  <PageHeader
    className={cx(className)}
    title={title}
    description={description}
    meta={
      typeof clientCount === 'number' ? (
        <span className="tabular-nums">{clientCount.toLocaleString()} clients</span>
      ) : undefined
    }
    actions={
      secondaryActions || onAddMember ? (
        <div className="flex flex-wrap items-center gap-2">
          {secondaryActions}
          {onAddMember ? (
            <Button variant="primary" onClick={onAddMember}>
              {addLabel}
            </Button>
          ) : null}
        </div>
      ) : undefined
    }
  />
);

export default MemberPageHeader;
