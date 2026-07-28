import React from 'react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import type { InventorySortOption } from './InventoryToolbar';

export interface InventorySortSheetProps {
  open: boolean;
  onClose: () => void;
  sortBy: InventorySortOption;
  onSortChange: (value: InventorySortOption) => void;
}

const OPTIONS: { value: InventorySortOption; label: string }[] = [
  { value: 'a-z', label: 'A–Z' },
  { value: 'z-a', label: 'Z–A' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

export const InventorySortSheet: React.FC<InventorySortSheetProps> = ({
  open,
  onClose,
  sortBy,
  onSortChange,
}) => (
  <Sheet
    open={open}
    onClose={onClose}
    title="Sort"
    side="bottom"
    footer={
      <Button fullWidth variant="primary" onClick={onClose}>
        Done
      </Button>
    }
  >
    <div className="space-y-2" role="listbox" aria-label="Sort options">
      {OPTIONS.map((option) => {
        const selected = sortBy === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onSortChange(option.value)}
            className={cx(
              'w-full text-left px-4 py-3 rounded-ui-md border transition-colors',
              selected
                ? 'bg-[var(--brand-soft)] border-[var(--brand)] text-[var(--brand)] font-semibold'
                : 'bg-[var(--bg-surface)] border-[var(--line)] text-[var(--text-primary)]',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </Sheet>
);

export default InventorySortSheet;
