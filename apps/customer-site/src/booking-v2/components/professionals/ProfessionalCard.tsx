/**
 * ProfessionalCard — a single selectable professional option.
 *
 * Rendered as a `role="radio"` button. Used both for the "Any available"
 * recommended option and for specific staff. Selection is conveyed with text +
 * icon (not colour alone), has a visible focus state, an avatar with an initials
 * fallback for missing photos, and a minimum touch target.
 */
import React from 'react';

interface Props {
  title: string;
  subtitle?: string | null;
  photoUrl?: string | null;
  initials: string;
  selected: boolean;
  recommended?: boolean;
  onSelect: () => void;
}

export function ProfessionalCard({
  title,
  subtitle,
  photoUrl,
  initials,
  selected,
  recommended,
  onSelect,
}: Props) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`bgv2-pro-card${selected ? ' is-selected' : ''}`}
      onClick={onSelect}
    >
      <span className="bgv2-pro-avatar">
        {photoUrl ? (
          <img src={photoUrl} alt="" loading="lazy" width={48} height={48} />
        ) : (
          <span className="bgv2-pro-avatar--fallback" aria-hidden="true">
            {initials}
          </span>
        )}
      </span>

      <span className="bgv2-pro-body">
        <span className="bgv2-pro-head">
          <span className="bgv2-pro-name">{title}</span>
          {selected && (
            <span className="bgv2-pro-selected" aria-hidden="true">
              ✓ Selected
            </span>
          )}
        </span>
        {recommended && <span className="bgv2-pro-recommended">Recommended</span>}
        {subtitle && <span className="bgv2-pro-role">{subtitle}</span>}
      </span>
    </button>
  );
}
