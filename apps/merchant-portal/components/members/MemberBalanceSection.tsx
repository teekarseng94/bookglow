import React from 'react';
import { cx } from '../ui/cx';

export interface MemberBalanceItem {
  id: string;
  label: string;
  value: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  hint?: string;
  toneClass?: string;
}

export interface MemberBalanceSectionProps {
  title?: string;
  items: MemberBalanceItem[];
  className?: string;
}

/**
 * Separate balance tiles — do not merge financially different balances.
 * Parent supplies values and click handlers (points / credits / vouchers / outstanding).
 */
export const MemberBalanceSection: React.FC<MemberBalanceSectionProps> = ({
  title,
  items,
  className,
}) => (
  <section
    className={cx(
      'bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs p-4 sm:p-6',
      className,
    )}
  >
    {title ? (
      <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">
        {title}
      </h4>
    ) : null}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={item.disabled}
          onClick={item.onClick}
          className={cx(
            'text-center rounded-ui-sm p-2 transition-colors',
            item.onClick && !item.disabled ? 'cursor-pointer hover:bg-[var(--bg-soft)]' : 'cursor-default',
            item.disabled && 'opacity-60',
          )}
        >
          {item.icon ? (
            <div className={cx('inline-flex items-center justify-center w-10 h-10 rounded-ui-sm mb-2', item.toneClass)}>
              {item.icon}
            </div>
          ) : null}
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase">{item.label}</p>
          <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{item.value}</p>
          {item.hint ? <p className="text-[10px] font-semibold text-[var(--brand)] uppercase mt-0.5">{item.hint}</p> : null}
        </button>
      ))}
    </div>
  </section>
);

export default MemberBalanceSection;
