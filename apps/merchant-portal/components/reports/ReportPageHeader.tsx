import React from 'react';
import { PageHeader } from '../ui/PageHeader';
import { cx } from '../ui/cx';

export interface ReportPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/** Shared reporting page header for Sales History, Reports, and Finance. */
export const ReportPageHeader: React.FC<ReportPageHeaderProps> = ({
  title,
  description,
  actions,
  className,
}) => (
  <PageHeader className={cx('m-page-header--compact m-page-header--app-owned', className)} title={title} description={description} actions={actions} />
);

export default ReportPageHeader;
