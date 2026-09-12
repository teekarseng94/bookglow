import React, { useCallback, useEffect, useMemo, useState } from "react";
import { hasCapability, type MerchantRole } from "@bookglow/auth-contracts";
import { useUserContext } from "../../contexts/UserContext";
import {
  disconnectGoogleReviews,
  getGoogleConnection,
  listGoogleLocations,
  refreshGoogleReviews,
  selectGoogleLocation,
  setGoogleReviewsVisibility,
  startGoogleAuthorization,
  type GoogleBusinessLocation,
  type GoogleReviewsConnection,
} from "../../services/googleReviewsService";

const MAPS_HINT_KEY = (outletId: string) => `bookglow.googleMapsHint.${outletId}`;

/** Reads `?google=` / `?google_detail=` from the OAuth redirect (HashRouter aware). */
function readRedirectNotice(): { status: string | null; detail: string | null } {
  const hash = window.location.hash || "";
  const queryIndex = hash.indexOf("?");
  const search = queryIndex >= 0 ? hash.slice(queryIndex + 1) : window.location.search.replace(/^\?/, "");
  const params = new URLSearchParams(search);
  return { status: params.get("google"), detail: params.get("google_detail") };
}

function clearRedirectNotice() {
  const hash = window.location.hash || "";
  const queryIndex = hash.indexOf("?");
  if (queryIndex >= 0) {
    window.history.replaceState(null, "", `${window.location.pathname}${hash.slice(0, queryIndex)}`);
  } else if (window.location.search) {
    window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
  }
}

function formatTimestamp(value?: string | null): string {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Never";
  return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const STATUS_LABELS: Record<GoogleReviewsConnection["status"], { label: string; tone: string }> = {
  setup_required: { label: "Setup required", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  disconnected: { label: "Not connected", tone: "bg-[var(--bg-subtle,#f5f5f7)] text-[var(--text-muted)] border-[var(--line)]" },
  pending_location: { label: "Choose a location", tone: "bg-sky-50 text-sky-700 border-sky-200" },
  connected: { label: "Connected", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  needs_reauth: { label: "Reconnect required", tone: "bg-red-50 text-red-700 border-red-200" },
  error: { label: "Attention needed", tone: "bg-red-50 text-red-700 border-red-200" },
};

export function GoogleReviewsCard({ outletId }: { outletId: string }) {
  const { role: legacyRole } = useUserContext();
  const role: MerchantRole = legacyRole === "admin" ? "owner" : (legacyRole || "cashier");
  const canManage = hasCapability(role, "settings.manage");

  const [connection, setConnection] = useState<GoogleReviewsConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [locations, setLocations] = useState<GoogleBusinessLocation[] | null>(null);
  const [chosen, setChosen] = useState<GoogleBusinessLocation | null>(null);
  const [mapsHint, setMapsHint] = useState("");

  useEffect(() => {
    if (!outletId) return;
    try {
      setMapsHint(window.localStorage.getItem(MAPS_HINT_KEY(outletId)) || "");
    } catch {
      /* private browsing */
    }
  }, [outletId]);

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    setError(null);
    try {
      setConnection(await getGoogleConnection(outletId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The Google Reviews connection could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Surface the outcome of the Google OAuth redirect once, then clean the URL.
  useEffect(() => {
    const { status, detail } = readRedirectNotice();
    if (!status) return;
    if (status === "select_location") setNotice("Google is authorized. Choose the business location to show.");
    else if (status === "cancelled") setNotice("Google authorization was cancelled.");
    else if (status === "setup_required") setError(detail || "Google Business Profile is not configured on the server yet.");
    else setError(detail || "Google authorization did not complete.");
    clearRedirectNotice();
  }, []);

  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The request failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleConnect = () =>
    run("connect", async () => {
      try {
        window.localStorage.setItem(MAPS_HINT_KEY(outletId), mapsHint.trim());
      } catch {
        /* private browsing */
      }
      const authorizationUrl = await startGoogleAuthorization(outletId);
      window.location.assign(authorizationUrl);
    });

  const handleLoadLocations = () =>
    run("locations", async () => {
      const list = await listGoogleLocations(outletId);
      setLocations(list);
      setChosen(null);
      if (list.length === 0) {
        setNotice("No business locations were found on the authorized Google account.");
      }
    });

  const handleSaveLocation = () => {
    if (!chosen) return;
    return run("save", async () => {
      const result = await selectGoogleLocation(outletId, chosen.accountName, chosen.locationName);
      setConnection(result.connection);
      setLocations(null);
      setChosen(null);
      setNotice(result.warning ? `Location saved. ${result.warning}` : "Google location saved.");
    });
  };

  const handleRefresh = () =>
    run("refresh", async () => {
      setConnection(await refreshGoogleReviews(outletId));
      setNotice("Google rating and review count refreshed.");
    });

  const handleToggle = (enabled: boolean) =>
    run("visibility", async () => {
      setConnection(await setGoogleReviewsVisibility(outletId, enabled));
    });

  const handleDisconnect = () => {
    if (!window.confirm("Disconnect Google Business Profile? Google reviews will stop showing on your booking page.")) {
      return;
    }
    return run("disconnect", async () => {
      setConnection(await disconnectGoogleReviews(outletId));
      setLocations(null);
      setChosen(null);
      setNotice("Google Business Profile disconnected.");
    });
  };

  const status = connection?.status ?? "disconnected";
  const badge = STATUS_LABELS[status];
  const ratingLabel = useMemo(() => {
    if (typeof connection?.averageRating !== "number") return null;
    return connection.averageRating.toFixed(1);
  }, [connection?.averageRating]);

  if (!canManage) {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-surface)] p-4">
        <p className="m-settings-value text-sm">Google Reviews</p>
        <p className="m-settings-hint mt-1">Only an outlet admin can manage this integration.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-surface)] p-4 min-w-0">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.1 6 20.3l1.3-6.7-5-4.6 6.8-.8z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="m-settings-value text-sm">Google Reviews</p>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge.tone}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Show your Google rating and customer reviews on your booking page.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-3 space-y-2" aria-hidden>
          <div className="h-3 w-2/3 rounded bg-[var(--line-soft,#eee)] animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-[var(--line-soft,#eee)] animate-pulse" />
        </div>
      ) : null}

      {!loading && status === "setup_required" ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800">Google configuration is missing on the server.</p>
          <p className="text-xs text-amber-700 mt-1">
            An administrator needs to add the Google Business Profile credentials to the BookGlow backend before this
            integration can be connected. See <code>docs/GOOGLE_REVIEWS_INTEGRATION.md</code>.
          </p>
          {connection?.missingConfig?.length ? (
            <p className="text-xs text-amber-700 mt-1">Not configured: {connection.missingConfig.join(", ")}</p>
          ) : null}
        </div>
      ) : null}

      {!loading && status === "disconnected" ? (
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="google-maps-hint" className="m-settings-label block">
              Google Maps listing URL <span className="font-normal text-[var(--text-muted)]">(optional)</span>
            </label>
            <input
              id="google-maps-hint"
              type="url"
              inputMode="url"
              placeholder="https://maps.app.goo.gl/…"
              className="m-settings-control"
              value={mapsHint}
              onChange={(event) => setMapsHint(event.target.value)}
            />
            <p className="m-settings-hint mt-1">
              Only a reminder to help you pick the right listing. Connecting still requires signing in to the Google
              account that manages the business.
            </p>
          </div>
          <button
            type="button"
            onClick={handleConnect}
            disabled={busy === "connect"}
            className="m-settings-btn w-full sm:w-auto bg-[var(--brand)] text-white font-semibold rounded-lg px-4 disabled:opacity-60"
          >
            {busy === "connect" ? "Opening Google…" : "Connect Google Business Profile"}
          </button>
        </div>
      ) : null}

      {!loading && (status === "pending_location" || status === "needs_reauth") ? (
        <div className="mt-3 space-y-3">
          {status === "needs_reauth" ? (
            <p className="text-xs text-red-700">
              Google authorization expired. Reconnect to keep showing reviews.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {status === "pending_location" ? (
              <button
                type="button"
                onClick={handleLoadLocations}
                disabled={busy === "locations"}
                className="m-settings-btn bg-[var(--brand)] text-white font-semibold rounded-lg px-4 disabled:opacity-60"
              >
                {busy === "locations" ? "Loading locations…" : "Choose business location"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                disabled={busy === "connect"}
                className="m-settings-btn bg-[var(--brand)] text-white font-semibold rounded-lg px-4 disabled:opacity-60"
              >
                {busy === "connect" ? "Opening Google…" : "Reconnect Google"}
              </button>
            )}
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={busy === "disconnect"}
              className="m-settings-btn rounded-lg px-4 border border-[var(--line)] text-[var(--text-secondary)] disabled:opacity-60"
            >
              Disconnect
            </button>
          </div>
          {mapsHint.trim() ? (
            <p className="m-settings-hint">
              Listing you noted: <span className="break-all">{mapsHint.trim()}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {locations && locations.length > 0 ? (
        <div className="mt-3 rounded-lg border border-[var(--line)] p-3">
          <p className="m-settings-subhead">Select the listing to display</p>
          <div className="mt-2 max-h-64 overflow-y-auto space-y-2">
            {locations.map((location) => {
              const selected = chosen?.locationName === location.locationName;
              return (
                <label
                  key={`${location.accountName}/${location.locationName}`}
                  className={`flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer ${
                    selected ? "border-[var(--brand)] bg-[var(--brand-soft)]" : "border-[var(--line)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="google-location"
                    className="mt-1 flex-shrink-0"
                    checked={selected}
                    onChange={() => setChosen(location)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[var(--text-primary)] break-words">
                      {location.title}
                    </span>
                    <span className="block text-xs text-[var(--text-muted)] break-words">
                      {location.address || "No street address on this listing"}
                    </span>
                    <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">{location.accountLabel}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {chosen ? (
            <div className="mt-3 rounded-lg bg-[var(--bg-selection,#f6f4ff)] p-2.5">
              <p className="text-xs text-[var(--text-secondary)]">Confirm this is the right business:</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] break-words">{chosen.title}</p>
              <p className="text-xs text-[var(--text-muted)] break-words">{chosen.address || "No street address"}</p>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveLocation}
              disabled={!chosen || busy === "save"}
              className="m-settings-btn bg-[var(--brand)] text-white font-semibold rounded-lg px-4 disabled:opacity-60"
            >
              {busy === "save" ? "Saving…" : "Use this location"}
            </button>
            <button
              type="button"
              onClick={() => {
                setLocations(null);
                setChosen(null);
              }}
              className="m-settings-btn rounded-lg px-4 border border-[var(--line)] text-[var(--text-secondary)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {!loading && (status === "connected" || status === "error") ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-[var(--line)] p-3">
            <p className="text-sm font-semibold text-[var(--text-primary)] break-words">
              {connection?.locationTitle || "Google location"}
            </p>
            {connection?.locationAddress ? (
              <p className="text-xs text-[var(--text-muted)] break-words">{connection.locationAddress}</p>
            ) : null}
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-[var(--text-muted)]">Google rating</dt>
              <dd className="text-[var(--text-primary)] font-semibold">
                {ratingLabel && typeof connection?.totalReviewCount === "number"
                  ? `${ratingLabel} · ${connection.totalReviewCount.toLocaleString()} reviews`
                  : "Not available yet"}
              </dd>
              <dt className="text-[var(--text-muted)]">Last refreshed</dt>
              <dd className="text-[var(--text-primary)]">{formatTimestamp(connection?.lastSyncedAt)}</dd>
              {connection?.connectedEmail ? (
                <>
                  <dt className="text-[var(--text-muted)]">Authorized by</dt>
                  <dd className="text-[var(--text-primary)] break-all">{connection.connectedEmail}</dd>
                </>
              ) : null}
            </dl>
            {connection?.mapsUri ? (
              <a
                href={connection.mapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-xs font-semibold text-[var(--brand)] hover:underline"
              >
                View listing on Google Maps
              </a>
            ) : null}
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 flex-shrink-0"
              checked={connection?.showOnBookingPage === true}
              disabled={busy === "visibility"}
              onChange={(event) => void handleToggle(event.target.checked)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-[var(--text-primary)]">
                Show Google reviews on booking page
              </span>
              <span className="block text-xs text-[var(--text-muted)]">
                Customers see your Google rating and reviews in the Reviews section.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={busy === "refresh"}
              className="m-settings-btn rounded-lg px-4 border border-[var(--line)] text-[var(--text-secondary)] disabled:opacity-60"
            >
              {busy === "refresh" ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={handleLoadLocations}
              disabled={busy === "locations"}
              className="m-settings-btn rounded-lg px-4 border border-[var(--line)] text-[var(--text-secondary)] disabled:opacity-60"
            >
              {busy === "locations" ? "Loading…" : "Change location"}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={busy === "disconnect"}
              className="m-settings-btn rounded-lg px-4 border border-red-200 text-red-700 disabled:opacity-60"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : null}

      {connection?.lastErrorMessage && status !== "setup_required" ? (
        <p className="mt-3 text-xs text-red-700 break-words">{connection.lastErrorMessage}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-xs text-red-700 break-words">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-3 text-xs text-emerald-700 break-words">
          {notice}
        </p>
      ) : null}
    </div>
  );
}

export default GoogleReviewsCard;
