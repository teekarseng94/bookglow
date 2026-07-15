import React from 'react';
import { PageHeader } from '../ui/PageHeader';
import { cx } from '../ui/cx';

export interface SettingsPageHeaderProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const SettingsPageHeader: React.FC<SettingsPageHeaderProps> = ({
  title = 'Settings',
  description = 'Manage your outlet and app preferences.',
  actions,
  className,
}) => (
  <PageHeader className={cx(className)} title={title} description={description} actions={actions} />
);

export default SettingsPageHeader;
