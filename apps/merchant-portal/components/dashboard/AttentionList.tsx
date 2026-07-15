import React from 'react';
import { cx } from '../ui/cx';

export interface AttentionItem {
  id: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'warning' | 'info' | 'neutral';
}

export interface AttentionListProps {
  title?: string;
  items: AttentionItem[];
  className?: string;
}

const toneClass = {
  warning: 'border-amber-200 bg-amber-50',
  info: 'border-sky-200 bg-sky-50',
  neutral: 'border-[var(--line)] bg-[var(--bg-soft)]',
} as const;

/** Needs-attention strip — parent supplies items from existing data only. */
export const AttentionList: React.FC<AttentionListProps> = ({
  title = 'Needs attention',
  items,
  className,
}) => {
  if (items.length === 0) return null;
  return (
    <section className={cx('space-y-2', className)}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cx(
              'flex items-center justify-between gap-3 rounded-ui-md border px-4 py-3',
              toneClass[item.tone || 'neutral'],
            )}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
              {item.description ? (
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.description}</p>
              ) : null}
            </div>
            {item.onAction && item.actionLabel ? (
              <button
                type="button"
                onClick={item.onAction}
                className="shrink-0 px-3 py-1.5 rounded-ui-sm bg-[var(--brand)] text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all"
              >
                {item.actionLabel}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
};

export default AttentionList;
