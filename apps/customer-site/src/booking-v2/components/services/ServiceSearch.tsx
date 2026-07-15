/**
 * ServiceSearch — accessible, case-insensitive local search input.
 *
 * Filters the already-loaded catalogue on the client (never queries Firestore
 * per keystroke). Rendered secondary; the caller may hide it for tiny menus.
 */
import React, { useId } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
}

export function ServiceSearch({ value, onChange, resultCount }: Props) {
  const id = useId();
  return (
    <div className="bgv2-service-search">
      <label className="bgv2-visually-hidden" htmlFor={id}>
        Search services
      </label>
      <input
        id={id}
        type="search"
        className="bgv2-search-input"
        placeholder="Search services…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      {value.trim() !== '' && (
        <span className="bgv2-live-note" aria-live="polite">
          {resultCount} {resultCount === 1 ? 'result' : 'results'}
        </span>
      )}
    </div>
  );
}
