import React, { useState } from 'react';
import { cx } from '../ui/cx';

export interface ExpandableTextProps {
  text: string;
  className?: string;
  lines?: 1 | 2;
}

/** Truncated copy is operable for touch and keyboard — not hover-only `title` tooltips. */
export const ExpandableText: React.FC<ExpandableTextProps> = ({ text, className, lines = 2 }) => {
  const [expanded, setExpanded] = useState(false);
  const clampClass = lines === 1 ? 'truncate' : 'line-clamp-2';

  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={expanded ? text : `Show full text: ${text}`}
      onClick={() => setExpanded((open) => !open)}
      className={cx(
        'min-w-0 max-w-full rounded-ui-sm text-left focus-visible:shadow-ui-focus-strong',
        className,
      )}
    >
      <span className={cx('block min-w-0', expanded ? 'whitespace-normal [overflow-wrap:anywhere]' : clampClass)}>
        {text}
      </span>
    </button>
  );
};

export default ExpandableText;
