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
    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{title}</h3>
    <div className="bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs p-4 space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] text-center py-4">{emptyMessage}</p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className={cx('flex items-center justify-between gap-3 rounded-ui-md border px-3 py-2.5', toneClass[item.tone || 'neutral'])}
          >
            <div className="flex items-center gap-3 min-w-0">
              {item.icon ? (
                <span className={cx('w-8 h-8 rounded-full flex items-center justify-center shrink-0', iconWrapClass[item.tone || 'neutral'])}>
                  {item.icon}
                </span>
              ) : null}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.title}</p>
                {item.description ? (
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{item.description}</p>
                ) : null}
              </div>
            </div>
            {item.onAction && item.actionLabel ? (
              <button
                type="button"
                onClick={item.onAction}
                className="shrink-0 px-3 py-1.5 rounded-ui-sm bg-[var(--bg-surface)] border border-[var(--line-strong)] text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--bg-soft)] active:scale-95 transition-all"
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
        className="w-full py-2 rounded-ui-sm bg-[var(--bg-soft)] border border-[var(--line)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-selection)] transition-colors"
      >
        {footerLabel}
      </button>
    ) : null}
  </section>
);

export default AttentionList;
