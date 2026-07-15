import React from 'react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';

export interface ReportFilterOption<T extends string = string> {
  value: T;
  label: string;
}

export interface ReportFilterSheetProps<TFilter extends string = string, TSort extends string = string> {
  open: boolean;
  onClose: () => void;
  title?: string;
  filterLabel?: string;
  filterOptions: ReportFilterOption<TFilter>[];
  filterValue: TFilter;
  onFilterChange: (value: TFilter) => void;
  sortLabel?: string;
  sortOptions?: ReportFilterOption<TSort>[];
  sortValue?: TSort;
  onSortChange?: (value: TSort) => void;
  orderLabel?: string;
  orderOptions?: ReportFilterOption<'asc' | 'desc'>[];
  orderValue?: 'asc' | 'desc';
  onOrderChange?: (value: 'asc' | 'desc') => void;
  onClear?: () => void;
  clearLabel?: string;
  applyLabel?: string;
}

function ChipButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'px-3.5 min-h-[40px] rounded-full text-xs font-bold border transition-colors',
        active
          ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--line)]',
      )}
    >
      {label}
    </button>
  );
}

/** Mobile filter / sort sheet. Parent owns values and apply side-effects. */
export function ReportFilterSheet<TFilter extends string = string, TSort extends string = string>({
  open,
  onClose,
  title = 'Sort & Filter',
  filterLabel = 'Record Type',
  filterOptions,
  filterValue,
  onFilterChange,
  sortLabel = 'Sort By',
  sortOptions,
  sortValue,
  onSortChange,
  orderLabel = 'Order',
  orderOptions,
  orderValue,
  onOrderChange,
  onClear,
  clearLabel = 'Clear',
  applyLabel = 'Apply',
}: ReportFilterSheetProps<TFilter, TSort>) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      side="bottom"
      footer={
        <div className="flex gap-3">
          {onClear ? (
            <Button type="button" variant="secondary" className="flex-1" onClick={onClear}>
              {clearLabel}
            </Button>
          ) : null}
          <Button type="button" variant="primary" className="flex-[2]" onClick={onClose}>
            {applyLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            {filterLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((opt) => (
              <ChipButton
                key={opt.value}
                active={filterValue === opt.value}
                label={opt.label}
                onClick={() => onFilterChange(opt.value)}
              />
            ))}
          </div>
        </div>

        {sortOptions && onSortChange && sortValue !== undefined ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              {sortLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((opt) => (
                <ChipButton
                  key={opt.value}
                  active={sortValue === opt.value}
                  label={opt.label}
                  onClick={() => onSortChange(opt.value)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {orderOptions && onOrderChange && orderValue !== undefined ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              {orderLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {orderOptions.map((opt) => (
                <ChipButton
                  key={opt.value}
                  active={orderValue === opt.value}
                  label={opt.label}
                  onClick={() => onOrderChange(opt.value)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

export default ReportFilterSheet;
