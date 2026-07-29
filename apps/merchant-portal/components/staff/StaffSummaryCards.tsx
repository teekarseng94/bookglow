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

/**
 * Outlet-level KPI cards.
 * Mobile: 1 card per row (compact). Tablet: 2-col. Desktop xl: 5-col.
 */
export const StaffSummaryCards: React.FC<StaffSummaryCardsProps> = ({ cards, className }) => (
  <div
    className={cx(
      'grid grid-cols-1 gap-2',
      'sm:grid-cols-2 sm:gap-2.5',
      'xl:grid-cols-5 xl:gap-3',
      className,
    )}
  >
    {cards.map((card) => (
      <div
        key={card.id}
        className={cx(
          'min-w-0',
          'rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-xs',
          'px-3 py-2.5 xl:px-4 xl:py-3.5',
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
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
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2 min-w-0">
              <p className="m-staff-kpi-label truncate">{card.label}</p>
              <p className="m-staff-kpi-value xl:text-xl tabular-nums text-[var(--text-primary)] shrink-0">
                {card.value}
              </p>
            </div>
            <p className="m-staff-kpi-hint mt-0.5 truncate">{card.hint}</p>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default StaffSummaryCards;
