import React, { useEffect, useState } from "react";
import { AppModal } from "../ui/AppModal";
import { AppSheet } from "../ui/AppSheet";
import { Button } from "../ui/Button";
import type { GooglePlaceSearchResult } from "../../services/googleReviewsService";

function useDesktop(): boolean {
  const [desktop, setDesktop] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
    return window.matchMedia("(min-width: 768px)").matches;
  });
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(min-width: 768px)");
    const onChange = () => setDesktop(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return desktop;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      ★ {rating.toFixed(1)}
    </span>
  );
}

export function GooglePlacesSearchDialog({
  open,
  query,
  results,
  selected,
  searching,
  connecting,
  error,
  onQueryChange,
  onSelect,
  onConnect,
  onClose,
}: {
  open: boolean;
  query: string;
  results: GooglePlaceSearchResult[];
  selected: GooglePlaceSearchResult | null;
  searching: boolean;
  connecting: boolean;
  error: string | null;
  onQueryChange: (value: string) => void;
  onSelect: (place: GooglePlaceSearchResult) => void;
  onConnect: () => void;
  onClose: () => void;
}) {
  const desktop = useDesktop();
  const busy = searching || connecting;

  const body = (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="google-places-search" className="text-sm font-semibold text-[var(--text-primary)]">
          Business name or address
        </label>
        <input
          id="google-places-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Enter your business name or address"
          className="w-full min-h-11 rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] px-3 text-sm"
          autoComplete="off"
          disabled={connecting}
        />
        <p className="text-xs text-[var(--text-muted)]">
          Selecting a listing connects its public Google rating and review samples. This does not verify Google account ownership.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)] break-words">
          {error}
        </p>
      ) : null}

      {searching ? <p className="text-sm text-[var(--text-muted)]">Searching Google…</p> : null}

      {!searching && query.trim().length >= 2 && results.length === 0 && !error ? (
        <p className="text-sm text-[var(--text-secondary)]">No matching Google businesses found. Try a more specific name or address.</p>
      ) : null}

      <ul className="space-y-2 max-h-[45vh] overflow-y-auto" role="listbox" aria-label="Google business matches">
        {results.map((place) => {
          const selectedRow = selected?.placeId === place.placeId;
          return (
            <li key={place.placeId}>
              <button
                type="button"
                role="option"
                aria-selected={selectedRow}
                onClick={() => onSelect(place)}
                disabled={connecting}
                className={`w-full text-left rounded-ui-md border px-3 py-3 transition-colors ${
                  selectedRow
                    ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                    : "border-[var(--line)] hover:bg-[var(--bg-soft)]"
                }`}
              >
                <p className="text-sm font-semibold text-[var(--text-primary)] break-words">{place.title}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 break-words">
                  {place.address || "Address unavailable"}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                  {typeof place.rating === "number" ? <Stars rating={place.rating} /> : "Rating unavailable"}
                  {" · "}
                  {typeof place.userRatingCount === "number"
                    ? `${place.userRatingCount.toLocaleString()} Google reviews`
                    : "Review count unavailable"}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const footer = (
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
      <Button variant="secondary" onClick={onClose} disabled={connecting}>
        Cancel
      </Button>
      <Button onClick={onConnect} disabled={!selected || busy}>
        {connecting ? "Connecting…" : "Connect this business"}
      </Button>
    </div>
  );

  const title = "Find Your Business on Google";
  const description = "Search Google Places and choose the listing for this BookGlow outlet.";

  if (desktop) {
    return (
      <AppModal open={open} onClose={busy ? () => undefined : onClose} title={title} description={description} footer={footer} size="md" busy={busy}>
        {body}
      </AppModal>
    );
  }

  return (
    <AppSheet open={open} onClose={busy ? () => undefined : onClose} title={title} description={description} footer={footer} side="bottom" busy={busy}>
      {body}
    </AppSheet>
  );
}

export default GooglePlacesSearchDialog;
