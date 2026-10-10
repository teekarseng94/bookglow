import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { hasCapability, type MerchantRole } from "@bookglow/auth-contracts";
import { useUserContext } from "../contexts/UserContext";
import { Button } from "../components/ui/Button";
import { ConfirmationDialog } from "../components/ui/ConfirmationDialog";
import { GoogleMark } from "../components/integrations/GoogleMark";
import { GoogleConnectionStatus } from "../components/integrations/GoogleConnectionStatus";
import { GoogleBusinessSelectorDialog } from "../components/integrations/GoogleBusinessSelectorDialog";
import { GooglePlacesSearchDialog } from "../components/integrations/GooglePlacesSearchDialog";
import { googleRedirectNotice, merchantGoogleError } from "../integrations/googleErrors";
import {
  connectGooglePlace,
  disconnectGoogleReviews,
  getGoogleConnection,
  listGoogleLocations,
  refreshGoogleReviews,
  searchGooglePlaces,
  selectGoogleLocation,
  setGoogleReviewsVisibility,
  startGoogleAuthorization,
  type GoogleBusinessLocation,
  type GooglePlaceSearchResult,
  type GoogleReviewsConnection,
} from "../services/googleReviewsService";
import { outletService } from "../services/databaseService";
import {
  forgetGoogleConnection,
  readRememberedGoogleConnection,
  rememberGoogleConnection,
} from "../services/googleConnectionMemory";
import { openExternalUrl } from "../src/native/androidShell";

type TabId = "about" | "instructions";

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

const INSTRUCTIONS = [
  "Click Connect Google Reviews.",
  "Search for your business by name or address and choose the correct Google listing.",
  "BookGlow saves that Place ID for this outlet and syncs the public Google rating and up to five review samples.",
  "Turn on Show Google Reviews on Booking Page so customers can see them.",
];

const GoogleReviewsIntegrationPage: React.FC = () => {
  const { outletId, role: legacyRole, outletName } = useUserContext();
  const role: MerchantRole = legacyRole === "admin" ? "owner" : legacyRole || "cashier";
  const canManage = hasCapability(role, "settings.manage");

  const [tab, setTab] = useState<TabId>("about");
  const [connection, setConnection] = useState<GoogleReviewsConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GooglePlaceSearchResult[]>([]);
  const [chosenPlace, setChosenPlace] = useState<GooglePlaceSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [chosen, setChosen] = useState<GoogleBusinessLocation | null>(null);
  const [emptyLocations, setEmptyLocations] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [confirmChange, setConfirmChange] = useState(false);
  const [outletAddress, setOutletAddress] = useState("");
  const autoOpened = React.useRef(false);

  const defaultSearchQuery = useMemo(() => {
    return [outletName, outletAddress].filter((part) => part && part.trim()).join(" ").trim();
  }, [outletName, outletAddress]);

  const applyConnection = useCallback((outlet: string, next: GoogleReviewsConnection) => {
    setConnection(next);
    if (next.status === "disconnected") forgetGoogleConnection(outlet);
    else rememberGoogleConnection(outlet, next);
  }, []);

  const load = useCallback(async () => {
    if (!outletId) return;
    const cached = readRememberedGoogleConnection(outletId);
    if (cached) setConnection(cached);
    // Keep the saved connection on screen. A status failure must not flip it
    // back to the Connect button — that is what made merchants reconnect
    // after every login.
    if (!cached) setLoading(true);
    try {
      const next = await getGoogleConnection(outletId);
      applyConnection(outletId, next);
      setError(null);
    } catch (err) {
      if (!cached) {
        setError(merchantGoogleError(err instanceof Error ? err.message : null));
      }
    } finally {
      setLoading(false);
    }
  }, [outletId, applyConnection]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!outletId) return;
    void outletService.getById(outletId).then((outlet) => {
      const display = typeof outlet?.addressDisplay === "string" ? outlet.addressDisplay.trim() : "";
      const structured = outlet?.address;
      const fromParts =
        structured && typeof structured === "object"
          ? [structured.street, structured.city, structured.state, structured.country]
              .filter((part) => typeof part === "string" && part.trim())
              .join(", ")
          : "";
      setOutletAddress(display || fromParts);
    }).catch(() => setOutletAddress(""));
  }, [outletId]);

  useEffect(() => {
    const { status, detail } = readRedirectNotice();
    if (!status) return;
    const mapped = googleRedirectNotice(status, detail);
    if (mapped.notice) setNotice(mapped.notice);
    if (mapped.error) setError(mapped.error);
    if (mapped.openSelector) autoOpened.current = false;
    clearRedirectNotice();
  }, []);

  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await task();
    } catch (err) {
      setError(merchantGoogleError(err instanceof Error ? err.message : null));
    } finally {
      setBusy(null);
    }
  };

  const openPlacesSearch = useCallback((forceReplace = false) => {
    if (!canManage) return;
    if (connection?.status === "setup_required") {
      setError("Google Places is not configured yet. An administrator needs to add GOOGLE_PLACES_API_KEY on the BookGlow server.");
      return;
    }
    if (connection?.status === "connected" && !forceReplace) {
      setConfirmChange(true);
      return;
    }
    setSearchQuery(defaultSearchQuery);
    setSearchResults([]);
    setChosenPlace(null);
    setSearchError(null);
    setPlacesOpen(true);
  }, [canManage, connection?.status, defaultSearchQuery]);

  useEffect(() => {
    if (!placesOpen) return;
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2 || !outletId) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        setBusy("search");
        setSearchError(null);
        try {
          setSearchResults(await searchGooglePlaces(outletId, trimmed));
        } catch (err) {
          setSearchResults([]);
          setSearchError(merchantGoogleError(err instanceof Error ? err.message : null));
        } finally {
          setBusy((current) => (current === "search" ? null : current));
        }
      })();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [placesOpen, searchQuery, outletId]);

  const handleConnectPlace = () => {
    if (!chosenPlace || !outletId) return;
    return run("connect-place", async () => {
      const next = await connectGooglePlace(outletId, chosenPlace.placeId);
      applyConnection(outletId, next);
      setPlacesOpen(false);
      setConfirmChange(false);
      setSearchResults([]);
      setChosenPlace(null);
      setNotice("Saved for this outlet. It stays connected until you disconnect it.");
    });
  };

  const handleGbpConnect = () =>
    run("connect", async () => {
      if (!outletId) return;
      const authorizationUrl = await startGoogleAuthorization(outletId);
      await openExternalUrl(authorizationUrl);
    });

  const openSelector = useCallback(
    async (force = false) => {
      if (!outletId) return;
      if (!force && autoOpened.current) return;
      autoOpened.current = true;
      setBusy("locations");
      setError(null);
      try {
        const list = await listGoogleLocations(outletId);
        setLocations(list);
        setChosen(null);
        setEmptyLocations(list.length === 0);
        setSelectorOpen(true);
      } catch (err) {
        setError(merchantGoogleError(err instanceof Error ? err.message : null));
        autoOpened.current = false;
      } finally {
        setBusy(null);
      }
    },
    [outletId],
  );

  const preferPlaces =
    connection?.defaultProvider === "google_places" || connection?.provider === "google_places";

  useEffect(() => {
    if (loading || !canManage) return;
    // Do not auto-open the GBP location picker when Places is the default —
    // that path still needs Business Profile approval and traps merchants.
    if (preferPlaces) return;
    if (connection?.status === "pending_location" && !selectorOpen && !autoOpened.current) {
      void openSelector();
    }
  }, [loading, canManage, connection?.status, preferPlaces, selectorOpen, openSelector]);

  const handleSaveLocation = () => {
    if (!chosen || !outletId) return;
    return run("save", async () => {
      const result = await selectGoogleLocation(outletId, chosen.accountName, chosen.locationName);
      applyConnection(outletId, result.connection);
      setSelectorOpen(false);
      setLocations([]);
      setChosen(null);
      setNotice(result.warning ? `Location saved. ${result.warning}` : "Google Reviews connected.");
    });
  };

  const handleSync = () =>
    run("refresh", async () => {
      if (!outletId) return;
      applyConnection(outletId, await refreshGoogleReviews(outletId));
      setNotice("Google rating and reviews refreshed.");
    });

  const handleVisibility = (enabled: boolean) =>
    run("visibility", async () => {
      if (!outletId) return;
      applyConnection(outletId, await setGoogleReviewsVisibility(outletId, enabled));
      setNotice(enabled ? "Google Reviews will show on the Booking Page." : "Google Reviews hidden from the Booking Page.");
    });

  const handleDisconnect = () =>
    run("disconnect", async () => {
      if (!outletId) return;
      const next = await disconnectGoogleReviews(outletId);
      forgetGoogleConnection(outletId);
      setConnection(next);
      setSelectorOpen(false);
      setPlacesOpen(false);
      setLocations([]);
      setChosen(null);
      setConfirmDisconnect(false);
      setNotice("Google Reviews disconnected.");
    });

  const status = connection?.status ?? "disconnected";
  const connected = status === "connected" || status === "error";
  const reconnect = status === "needs_reauth";
  const setupRequired = status === "setup_required";
  const providerLabel =
    connection?.provider === "google_business_profile"
      ? "Connected via Google Business Profile"
      : connection?.provider === "google_places"
        ? "Connected via Google Places"
        : null;

  const primaryAction = () => {
    if (!canManage) return null;
    if (setupRequired) return null;
    if (connected) {
      return (
        <Button variant="outline" onClick={() => setConfirmDisconnect(true)} disabled={Boolean(busy)} fullWidth>
          Disconnect
        </Button>
      );
    }
    if (reconnect) {
      return (
        <Button onClick={handleGbpConnect} disabled={busy === "connect"} fullWidth>
          {busy === "connect" ? "Opening Google…" : "Reconnect Business Profile"}
        </Button>
      );
    }
    // Stuck GBP "pending_location" must not block Places when Places is configured.
    if (status === "pending_location" && !preferPlaces) {
      return (
        <Button onClick={() => void openSelector(true)} disabled={busy === "locations"} fullWidth>
          {busy === "locations" ? "Loading locations…" : "Choose a location"}
        </Button>
      );
    }
    return (
      <>
        <Button onClick={() => openPlacesSearch(false)} disabled={Boolean(busy)} fullWidth>
          Connect Google Reviews
        </Button>
        {status === "pending_location" && preferPlaces ? (
          <Button
            variant="outline"
            onClick={() => setConfirmDisconnect(true)}
            disabled={Boolean(busy)}
            fullWidth
          >
            Cancel incomplete Business Profile setup
          </Button>
        ) : null}
      </>
    );
  };

  return (
    <div className="m-page-with-bottom-nav min-w-0 overflow-x-hidden animate-fadeIn flex flex-col min-h-[calc(100dvh-8rem)]">
      <div className="max-w-xl mx-auto w-full flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Link
            to="/integrations"
            className="p-2 -ml-2 rounded-ui-sm text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
            aria-label="Back to Integrations"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="ui-page-title text-lg sm:text-xl">Google Reviews</h1>
        </div>

        <div className="flex border-b border-[var(--line)]" role="tablist" aria-label="Google Reviews">
          {(["about", "instructions"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === id
                  ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-muted)]"
              }`}
            >
              {id === "about" ? "About" : "Instructions"}
            </button>
          ))}
        </div>

        <div className="flex-1 py-6 space-y-5">
          {loading ? (
            <div className="space-y-2" aria-hidden>
              <div className="h-4 w-2/3 rounded bg-[var(--line-soft,#eee)] animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-[var(--line-soft,#eee)] animate-pulse" />
            </div>
          ) : null}

          {!canManage && !loading ? (
            <p className="text-sm text-[var(--text-muted)]">Only an outlet admin can manage this integration.</p>
          ) : null}

          {tab === "about" && !loading ? (
            connected && connection ? (
              <div className="space-y-4">
                <GoogleConnectionStatus connection={connection} />
                {providerLabel ? <p className="text-xs text-[var(--text-muted)]">{providerLabel}</p> : null}
                <label className="flex items-center justify-between gap-3 rounded-ui-md border border-[var(--line)] px-3 py-3">
                  <span className="text-sm text-[var(--text-secondary)]">Show Google Reviews on Booking Page</span>
                  <input
                    type="checkbox"
                    checked={connection.showOnBookingPage === true}
                    disabled={!canManage || busy === "visibility"}
                    onChange={(event) => void handleVisibility(event.target.checked)}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <GoogleMark className="w-8 h-8" />
                  <p className="text-base font-semibold text-[var(--text-primary)]">Google Reviews</p>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Connect your Google Business listing to display your Google rating and customer reviews on your BookGlow Booking Page.
                </p>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  Search Google Places for your public listing. BookGlow will show the Google rating, total review count, and up to five review samples Google returns.
                </p>
              </div>
            )
          ) : null}

          {tab === "instructions" && !loading ? (
            <ol className="space-y-5">
              {INSTRUCTIONS.map((step, index) => (
                <li key={step} className="flex gap-3 min-w-0">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--bg-soft)] text-[var(--text-secondary)] text-sm font-semibold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed pt-0.5">{step}</p>
                </li>
              ))}
            </ol>
          ) : null}

          {setupRequired && connection?.missingConfig?.length ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-ui-md p-3">
              Google Places connection is currently unavailable. An administrator needs to add{" "}
              <code className="text-xs">GOOGLE_PLACES_API_KEY</code> on the BookGlow server first.
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-[var(--danger)] break-words">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="text-sm text-emerald-700 break-words">
              {notice}
            </p>
          ) : null}
        </div>

        {canManage && !loading && !selectorOpen && !placesOpen ? (
          <div className="sticky bottom-0 z-20 mt-auto pt-4 pb-[calc(0.75rem+var(--safe-bottom,0px))] bg-[var(--bg-canvas)] space-y-2">
            {connected ? (
              <>
                {connection?.mapsUri ? (
                  <Button variant="outline" onClick={() => void openExternalUrl(connection.mapsUri!)} fullWidth>
                    View Google Listing
                  </Button>
                ) : null}
                <Button variant="secondary" onClick={handleSync} disabled={busy === "refresh"} fullWidth>
                  {busy === "refresh" ? "Syncing…" : "Sync Now"}
                </Button>
                <Button variant="outline" onClick={() => openPlacesSearch(false)} disabled={Boolean(busy)} fullWidth>
                  Change Business
                </Button>
              </>
            ) : null}
            {primaryAction()}
            <Button variant="outline" onClick={() => setTab("instructions")} fullWidth>
              Support article
            </Button>
          </div>
        ) : null}
      </div>

      <GooglePlacesSearchDialog
        open={placesOpen}
        query={searchQuery}
        results={searchResults}
        selected={chosenPlace}
        searching={busy === "search"}
        connecting={busy === "connect-place"}
        error={searchError}
        onQueryChange={setSearchQuery}
        onSelect={setChosenPlace}
        onConnect={() => void handleConnectPlace()}
        onClose={() => {
          setPlacesOpen(false);
          setSearchError(null);
        }}
      />

      <GoogleBusinessSelectorDialog
        open={selectorOpen}
        locations={locations}
        selected={chosen}
        busy={busy === "save" || busy === "connect"}
        empty={emptyLocations}
        onSelect={setChosen}
        onConnect={() => void handleSaveLocation()}
        onClose={() => {
          setSelectorOpen(false);
          autoOpened.current = true;
        }}
        onTryAnotherAccount={() => void handleGbpConnect()}
      />

      <ConfirmationDialog
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={() => void handleDisconnect()}
        busy={busy === "disconnect"}
        tone="danger"
        title="Disconnect Google Reviews?"
        description="Google reviews will no longer appear on this outlet's Booking Page."
        confirmLabel="Disconnect"
        cancelLabel="Cancel"
      />

      <ConfirmationDialog
        open={confirmChange}
        onClose={() => setConfirmChange(false)}
        onConfirm={() => {
          setConfirmChange(false);
          openPlacesSearch(true);
        }}
        busy={false}
        tone="primary"
        title="Change Google business?"
        description="The current Google listing for this outlet will be replaced after you choose a new business."
        confirmLabel="Change business"
        cancelLabel="Cancel"
      />
    </div>
  );
};

export default GoogleReviewsIntegrationPage;
