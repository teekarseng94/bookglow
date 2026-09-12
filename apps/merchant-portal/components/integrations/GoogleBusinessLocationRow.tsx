import React from "react";
import type { GoogleBusinessLocation } from "../../services/googleReviewsService";
import { cx } from "../ui/cx";

export function GoogleBusinessLocationRow({
  location,
  selected,
  onSelect,
}: {
  location: GoogleBusinessLocation;
  selected: boolean;
  onSelect: () => void;
}) {
  const id = `${location.accountName}/${location.locationName}`;
  return (
    <label
      htmlFor={id}
      className={cx(
        "flex items-start gap-3 px-1 py-3 cursor-pointer min-w-0",
        selected ? "bg-[var(--brand-soft)] rounded-ui-md" : "",
      )}
    >
      <input
        id={id}
        type="radio"
        name="google-business-location"
        className="mt-1 flex-shrink-0 accent-[var(--brand)]"
        checked={selected}
        onChange={onSelect}
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--text-primary)] break-words">
          {location.title}
        </span>
        <span className="block text-xs text-[var(--text-muted)] mt-0.5 break-words leading-snug">
          {location.address || "No street address on this listing"}
        </span>
      </span>
    </label>
  );
}

export default GoogleBusinessLocationRow;
