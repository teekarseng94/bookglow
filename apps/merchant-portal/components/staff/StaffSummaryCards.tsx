import React from 'react';
import { cx } from '../ui/cx';

export interface StaffSummaryCardItem {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  emphasize?: boolean;
}

export interface StaffSummaryCardsProps {
  cards: StaffSummaryCardItem[];
  className?: string;
}

/** Outlet-level KPI strip — horizontal scroll on mobile, 5-col grid on xl. */
export const StaffSummaryCards: React.FC<StaffSummaryCardsProps> = ({ cards, className }) => (
  <div
    className={cx(
      'flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory',
      'xl:grid xl:grid-cols-5 xl:gap-3 xl:overflow-visible xl:pb-0 xl:mx-0 xl:px-0 xl:snap-none',
      className,
    )}
  >
    {cards.map((card) => (
      <div
        key={card.id}
        className={cx(
          'snap-start shrink-0 w-[9.5rem] sm:w-[11rem] xl:w-auto',
          'rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)]',
          'px-3 py-3 xl:px-4 xl:py-3.5 shadow-ui-xs',
        )}
      >
        <div className="flex items-start gap-2.5">
          <div
            className={cx(
              'w-8 h-8 xl:w-9 xl:h-9 rounded-full flex items-center justify-center shrink-0',
              card.emphasize
                ? 'bg-amber-50 text-amber-500'
                : 'bg-[var(--brand-soft)] text-[var(--brand)]',
            )}
          >
            {card.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[9px] xl:text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
              {card.label}
            </p>
            <p className="text-lg xl:text-xl font-black tabular-nums text-[var(--text-primary)] leading-tight mt-0.5">
              {card.value}
            </p>
            <p className="text-[10px] xl:text-[11px] font-medium text-[var(--text-secondary)] mt-0.5 truncate">
              {card.hint}
            </p>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default StaffSummaryCards;
