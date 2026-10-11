import React from 'react';
import { cx } from './cx';

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  overflowAction?: React.ReactNode;
  /** Local title scale when the heading is visible. Shell-owned headers hide the title on phone/tablet. */
  titleSize?: 'page' | 'compact';
  /** When true (default), the app shell owns the phone/tablet title. */
  appOwned?: boolean;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  meta,
  leading,
  actions,
  overflowAction,
  titleSize = 'page',
  appOwned = true,
  className,
}) => (
  <header
    className={cx(
      'm-page-header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
      'pb-3 border-b border-[var(--line)]',
      titleSize === 'compact' && 'm-page-header--compact',
      appOwned && 'm-page-header--app-owned',
      className,
    )}
  >
    <div className="m-page-header-main flex min-w-0 items-start">
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 space-y-1">
        <h1 className="ui-page-title truncate">{title}</h1>
        {description ? <p className="m-page-header-description ui-muted max-w-2xl">{description}</p> : null}
        {meta ? (
          <div className="m-page-header-meta pt-1 text-sm text-[var(--text-muted)]">{meta}</div>
        ) : null}
      </div>
    </div>
    {actions || overflowAction ? (
      <div className="m-page-header-actions flex flex-wrap items-center gap-2 shrink-0">
        {actions}
        {overflowAction}
      </div>
    ) : null}
  </header>
);

export default PageHeader;
