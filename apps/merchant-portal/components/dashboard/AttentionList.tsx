import React from 'react';
import { cx } from '../ui/cx';

export interface AttentionItem {
  id: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'danger' | 'warning' | 'info' | 'purple' | 'neutral';
  icon?: React.ReactNode;
}

export interface AttentionListProps {
  title?: string;
  items: AttentionItem[];
  emptyMessage?: string;
  footerLabel?: string;
  onFooterAction?: () => void;
  className?: string;
}

const toneClass = {
  danger: 'border-[var(--danger)]/20 bg-[var(--danger-soft)]',
  warning: 'border-[var(--warning)]/20 bg-[var(--warning-soft)]',
  info: 'border-[var(--info)]/20 bg-[var(--info-soft)]',
  purple: 'border-[var(--brand-border)] bg-[var(--brand-soft)]',
  neutral: 'border-[var(--line)] bg-[var(--bg-soft)]',
} as const;

const iconWrapClass = {
  danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
  warning: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  info: 'bg-[var(--info-soft)] text-[var(--info)]',
  purple: 'bg-[var(--brand-soft)] text-[var(--brand)]',
  neutral: 'bg-[var(--bg-soft)] text-[var(--text-muted)]',
} as const;

/** Needs-attention strip — parent supplies items from existing data only. */
export const AttentionList: React.FC<AttentionListProps> = ({
  title = 'Needs attention',
  items,
  emptyMessage = 'Everything looks good today.',
  footerLabel,
  onFooterAction,
  className,
}) => (
  <section className={cx('space-y-3', className)}>
    <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{title}</h2>
    <div className="bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs p-4 space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] text-center py-4">{emptyMessage}</p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className={cx('flex flex-wrap items-center justify-between gap-2 rounded-ui-md border px-3 py-2.5 sm:flex-nowrap sm:gap-3', toneClass[item.tone || 'neutral'])}
          >
            <div className="flex items-center gap-3 min-w-0">
              {item.icon ? (
                <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', iconWrapClass[item.tone || 'neutral'])}>
                  {item.icon}
                </span>
              ) : null}
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]" title={item.title}>{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-secondary)]" title={item.description}>{item.description}</p>
                ) : null}
              </div>
            </div>
            {item.onAction && item.actionLabel ? (
              <button
                type="button"
                onClick={item.onAction}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-ui-sm border border-[var(--line-strong)] bg-[var(--bg-surface)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-soft)] focus-visible:shadow-ui-focus-strong"
              >
                {item.actionLabel}
              </button>
            ) : null}
          </div>
        ))
      )}
    </div>
    {items.length > 0 && footerLabel && onFooterAction ? (
      <button
        type="button"
        onClick={onFooterAction}
        className="flex min-h-11 w-full items-center justify-center rounded-ui-sm border border-[var(--line)] bg-[var(--bg-soft)] py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-selection)] focus-visible:shadow-ui-focus-strong"
      >
        {footerLabel}
      </button>
    ) : null}
  </section>
);

export default AttentionList;
