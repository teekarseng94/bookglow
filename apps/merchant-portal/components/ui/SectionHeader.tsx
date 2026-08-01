import React from 'react';
import { cx } from './cx';

export interface SectionHeaderProps {
  title: React.ReactNode;
  count?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  count,
  description,
  actions,
  className,
}) => (
  <div className={cx('m-section-header flex items-start justify-between gap-3', className)}>
    <div className="min-w-0 space-y-1">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="ui-section-title">{title}</h2>
        {count != null ? <span className="m-section-header-count inline-flex items-center">{count}</span> : null}
      </div>
      {description ? <p className="ui-muted">{description}</p> : null}
    </div>
    {actions ? (
      <div className="m-section-header-actions flex flex-wrap items-center gap-2 shrink-0">
        {actions}
      </div>
    ) : null}
  </div>
);

export default SectionHeader;
