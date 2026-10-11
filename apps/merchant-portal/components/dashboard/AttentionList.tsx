import React from 'react';
import { cx } from '../ui/cx';
import { ExpandableText } from './ExpandableText';

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
  <section className={cx('space-y-2 sm:space-y-3', className)}>
    <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{title}</h2>
    <div className="overflow-hidden rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-xs">
      {items.length === 0 ? (
        <p className="px-3 py-4 text-center text-sm text-[var(--text-secondary)]">{emptyMessage}</p>
      ) : (
        <div className="divide-y divide-[var(--line)]">
          {items.map((item) => (
            <div
              key={item.id}
              className={cx(
                'm-list-row m-attention-row flex items-center gap-3 px-3',
                toneClass[item.tone || 'neutral'],
              )}
            >
              {item.icon ? (
                <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', iconWrapClass[item.tone || 'neutral'])}>
                  {item.icon}
                </span>
              ) : null}
              <div className="min-w-0 flex-1">
                <ExpandableText text={item.title} lines={1} className="text-sm font-semibold text-[var(--text-primary)]" />
                {item.description ? (
                  <ExpandableText text={item.description} lines={1} className="mt-0.5 text-xs text-[var(--text-secondary)]" />
                ) : null}
              </div>
              {item.onAction && item.actionLabel ? (
                <button
                  type="button"
                  onClick={item.onAction}
                  className="inline-flex h-11 min-h-[44px] min-w-11 shrink-0 items-center justify-center rounded-ui-sm border border-[var(--line-strong)] bg-[var(--bg-surface)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-soft)] focus-visible:shadow-ui-focus-strong"
                >
                  {item.actionLabel}
                </button>
              ) : null}
            </div>
          ))}
        </div>
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
