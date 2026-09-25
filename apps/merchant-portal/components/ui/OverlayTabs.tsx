import React, { useEffect, useRef } from 'react';
import { cx } from './cx';

export interface OverlayTabItem<T extends string> {
  id: T;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface OverlayTabsProps<T extends string> {
  items: OverlayTabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  variant?: 'underline' | 'segmented';
  className?: string;
}

/**
 * Scrollable tab list that keeps labels readable instead of wrapping or shrinking.
 */
export function OverlayTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  variant = 'underline',
  className,
}: OverlayTabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selected = listRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (typeof selected?.scrollIntoView === 'function') {
      selected.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
    }
  }, [value]);

  const focusTab = (index: number) => {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])');
    buttons?.[index]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const enabled = items.filter((item) => !item.disabled);
    const current = Math.max(0, enabled.findIndex((item) => item.id === value));
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const next = enabled[(current + 1) % enabled.length];
      if (next) {
        onChange(next.id);
        focusTab(items.findIndex((item) => item.id === next.id));
      }
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = enabled[(current - 1 + enabled.length) % enabled.length];
      if (next) {
        onChange(next.id);
        focusTab(items.findIndex((item) => item.id === next.id));
      }
    } else if (event.key === 'Home') {
      event.preventDefault();
      const next = enabled[0];
      if (next) {
        onChange(next.id);
        focusTab(items.findIndex((item) => item.id === next.id));
      }
    } else if (event.key === 'End') {
      event.preventDefault();
      const next = enabled[enabled.length - 1];
      if (next) {
        onChange(next.id);
        focusTab(items.findIndex((item) => item.id === next.id));
      }
    }
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cx(
        'm-overlay-tabs',
        variant === 'segmented' ? 'm-overlay-tabs--segmented' : 'm-overlay-tabs--underline',
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`overlay-tab-${item.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export default OverlayTabs;
