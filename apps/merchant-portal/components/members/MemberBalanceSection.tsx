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
      'm-member-balance bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs',
      'p-3 sm:p-6',
      className,
    )}
  >
    {title ? (
      <h4 className="m-member-balance__title uppercase tracking-widest text-[var(--text-muted)] mb-2 sm:mb-3">
        {title}
      </h4>
    ) : null}
    <div className="m-member-balance__grid grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={item.disabled}
          onClick={item.onClick}
          className={cx(
            'm-member-balance__cell text-left sm:text-center rounded-ui-sm transition-colors',
            'p-2.5 sm:p-2',
            item.onClick && !item.disabled ? 'cursor-pointer hover:bg-[var(--bg-soft)]' : 'cursor-default',
            item.disabled && 'opacity-60',
          )}
        >
          {item.icon ? (
            <div
              className={cx(
                'm-member-balance__icon inline-flex items-center justify-center rounded-ui-sm mb-1.5 sm:mb-2',
                'w-8 h-8 sm:w-10 sm:h-10',
                item.toneClass,
              )}
            >
              {item.icon}
            </div>
          ) : null}
          <p className="m-member-balance__label text-[11px] sm:text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
            {item.label}
          </p>
          <p className="m-member-balance__value text-base sm:text-lg font-semibold sm:font-bold text-[var(--text-primary)] tabular-nums leading-tight">
            {item.value}
          </p>
          {item.hint ? (
            <p className="m-member-balance__hint uppercase mt-0.5 text-[var(--brand)]">
              {item.hint}
            </p>
          ) : null}
        </button>
      ))}
    </div>
  </section>
);

export default MemberBalanceSection;
