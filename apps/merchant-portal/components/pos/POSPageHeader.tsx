import React from 'react';
import { PageHeader } from '../ui/PageHeader';
import { cx } from '../ui/cx';

export interface POSPageHeaderProps {
  title?: string;
  description?: string;
  banner?: React.ReactNode;
  className?: string;
}

export const POSPageHeader: React.FC<POSPageHeaderProps> = ({
  title = 'Point of Sale',
  description = 'Add items and complete checkout.',
  banner,
  className,
}) => (
  <div className={cx('space-y-3', className)}>
    <PageHeader title={title} description={description} className="lg:hidden border-b-0 pb-0" />
    {banner}
  </div>
);

export default POSPageHeader;
