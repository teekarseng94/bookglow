import React from 'react';
import { cx } from './cx';

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** Mobile title scale: page (26px) or compact header (20px). Desktop unchanged. */
  titleSize?: 'page' | 'compact';
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  meta,
  actions,
  titleSize = 'page',
  className,
}) => (
  <header
    className={cx(
      'm-page-header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
      'pb-4 border-b border-[var(--line)]',
      titleSize === 'compact' && 'm-page-header--compact',
      className,
    )}
  >
    <div className="min-w-0 space-y-1">
      <h1 className="ui-page-title truncate">{title}</h1>
      {description ? <p className="ui-muted max-w-2xl">{description}</p> : null}
      {meta ? (
        <div className="m-page-header-meta pt-1 text-sm text-[var(--text-muted)]">{meta}</div>
      ) : null}
    </div>
    {actions ? (
      <div className="m-page-header-actions flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
    ) : null}
  </header>
);

export default PageHeader;
