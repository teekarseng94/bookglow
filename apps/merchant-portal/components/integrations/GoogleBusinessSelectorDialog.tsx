import React, { useEffect, useState } from "react";
import { AppModal } from "../ui/AppModal";
import { AppSheet } from "../ui/AppSheet";
import { Button } from "../ui/Button";
import { ModalFooterActions } from "../ui/ModalParts";
import type { GoogleBusinessLocation } from "../../services/googleReviewsService";
import { GoogleBusinessLocationRow } from "./GoogleBusinessLocationRow";

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

export function GoogleBusinessSelectorDialog({
  open,
  locations,
  selected,
  busy,
  empty,
  onSelect,
  onConnect,
  onClose,
  onTryAnotherAccount,
}: {
  open: boolean;
  locations: GoogleBusinessLocation[];
  selected: GoogleBusinessLocation | null;
  busy: boolean;
  empty: boolean;
  onSelect: (location: GoogleBusinessLocation) => void;
  onConnect: () => void;
  onClose: () => void;
  onTryAnotherAccount: () => void;
}) {
  const desktop = useDesktop();

  const body = empty ? (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-secondary)]">
        No Google Business Profiles were found for this account.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={onTryAnotherAccount} disabled={busy} fullWidth={!desktop}>
          Try another Google account
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={busy} fullWidth={!desktop}>
          Cancel
        </Button>
      </div>
    </div>
  ) : (
    <div className="space-y-1 max-h-[50vh] overflow-y-auto -mx-1 px-1">
      {locations.map((location) => (
        <GoogleBusinessLocationRow
          key={`${location.accountName}/${location.locationName}`}
          location={location}
          selected={selected?.locationName === location.locationName}
          onSelect={() => onSelect(location)}
        />
      ))}
    </div>
  );

  const footer = empty ? null : (
    <ModalFooterActions>
      <Button variant="secondary" onClick={onClose} disabled={busy}>
        Cancel
      </Button>
      <Button onClick={onConnect} disabled={!selected || busy}>
        {busy ? "Connecting…" : "Connect"}
      </Button>
    </ModalFooterActions>
  );

  if (desktop) {
    return (
      <AppModal
        open={open}
        onClose={busy ? () => undefined : onClose}
        title="Select the business to connect"
        description="Google reviews from the selected business will appear on this outlet's BookGlow Booking Page."
        footer={footer}
        size="md"
        busy={busy}
      >
        {body}
      </AppModal>
    );
  }

  return (
    <AppSheet
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="Select the business to connect"
      description="Google reviews from the selected business will appear on this outlet's BookGlow Booking Page."
      footer={footer}
      side="bottom"
      busy={busy}
    >
      {body}
    </AppSheet>
  );
}

export default GoogleBusinessSelectorDialog;
