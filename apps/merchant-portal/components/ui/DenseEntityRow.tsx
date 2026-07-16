import React from 'react';
import { cx } from './cx';

export interface DenseEntityRowProps {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * Compact 2–3 row entity presentation. Values are passed in; no formatting logic.
 */
export const DenseEntityRow: React.FC<DenseEntityRowProps> = ({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  onClick,
  className,
}) => {
  const interactive = typeof onClick === 'function';
  const classNames = cx(
    'flex w-full items-center gap-3 px-3 py-2.5 text-left',
    'border-b border-[var(--line)] last:border-b-0',
    'bg-[var(--bg-surface)]',
    interactive && 'hover:bg-[var(--bg-soft)] focus-visible:shadow-ui-focus-strong',
    className,
  );
  const body = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{title}</div>
        {subtitle ? (
          <div className="truncate text-xs text-[var(--text-secondary)]">{subtitle}</div>
        ) : null}
        {meta ? <div className="truncate text-xs text-[var(--text-muted)]">{meta}</div> : null}
      </div>
      {trailing ? <div className="shrink-0 flex items-center gap-2">{trailing}</div> : null}
    </>
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={classNames}>
        {body}
      </button>
    );
  }

  return <div className={classNames}>{body}</div>;
};

export default DenseEntityRow;
