import React from 'react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';

export interface InventoryFiltersSheetProps {
  open: boolean;
  onClose: () => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const InventoryFiltersSheet: React.FC<InventoryFiltersSheetProps> = ({
  open,
  onClose,
  categories,
  selectedCategory,
  onCategoryChange,
}) => (
  <Sheet
    open={open}
    onClose={onClose}
    title="Filters"
    side="bottom"
    footer={
      <Button fullWidth variant="primary" onClick={onClose}>
        Done
      </Button>
    }
  >
    <div className="space-y-2">
      <p className="text-app-label font-bold uppercase text-[var(--text-muted)]">Category</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onCategoryChange('All')}
          className={cx(
            'px-3 py-2 rounded-ui-sm text-sm font-semibold border',
            selectedCategory === 'All'
              ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
              : 'bg-[var(--bg-soft)] border-[var(--line)] text-[var(--text-secondary)]',
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryChange(cat)}
            className={cx(
              'px-3 py-2 rounded-ui-sm text-sm font-semibold border',
              selectedCategory === cat
                ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                : 'bg-[var(--bg-soft)] border-[var(--line)] text-[var(--text-secondary)]',
            )}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  </Sheet>
);

export default InventoryFiltersSheet;
