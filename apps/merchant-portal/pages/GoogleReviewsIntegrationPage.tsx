import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { hasCapability, type MerchantRole } from "@bookglow/auth-contracts";
import { useUserContext } from "../contexts/UserContext";
import { Button } from "../components/ui/Button";
import { ConfirmationDialog } from "../components/ui/ConfirmationDialog";
import { GoogleMark } from "../components/integrations/GoogleMark";
import { GoogleConnectionStatus } from "../components/integrations/GoogleConnectionStatus";
import { GoogleBusinessSelectorDialog } from "../components/integrations/GoogleBusinessSelectorDialog";
import { googleRedirectNotice, merchantGoogleError } from "../integrations/googleErrors";
import {
  disconnectGoogleReviews,
  getGoogleConnection,
  listGoogleLocations,
  refreshGoogleReviews,
  selectGoogleLocation,
  startGoogleAuthorization,
  type GoogleBusinessLocation,
  type GoogleReviewsConnection,
} from "../services/googleReviewsService";

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
  "Click the Connect button.",
  "Sign in using a Google account that owns or manages a verified Google Business Profile and grant BookGlow access.",
  "If the account manages multiple businesses or locations, select the business you want connected to this BookGlow outlet.",
  "After connecting, BookGlow will sync that location's Google rating and reviews to the public Booking Page.",
];

const GoogleReviewsIntegrationPage: React.FC = () => {
  const { outletId, role: legacyRole } = useUserContext();
  const role: MerchantRole = legacyRole === "admin" ? "owner" : legacyRole || "cashier";
  const canManage = hasCapability(role, "settings.manage");

  const [tab, setTab] = useState<TabId>("about");
  const [connection, setConnection] = useState<GoogleReviewsConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [chosen, setChosen] = useState<GoogleBusinessLocation | null>(null);
  const [emptyLocations, setEmptyLocations] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const autoOpened = React.useRef(false);

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      setConnection(await getGoogleConnection(outletId));
    } catch (err) {
      setError(merchantGoogleError(err instanceof Error ? err.message : null));
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const handleConnect = () =>
    run("connect", async () => {
      if (!outletId) return;
      const authorizationUrl = await startGoogleAuthorization(outletId);
      window.location.assign(authorizationUrl);
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

  useEffect(() => {
    if (loading || !canManage) return;
    if (connection?.status === "pending_location" && !selectorOpen && !autoOpened.current) {
      void openSelector();
    }
  }, [loading, canManage, connection?.status, selectorOpen, openSelector]);

  const handleSaveLocation = () => {
    if (!chosen || !outletId) return;
    return run("save", async () => {
      const result = await selectGoogleLocation(outletId, chosen.accountName, chosen.locationName);
      setConnection(result.connection);
      setSelectorOpen(false);
      setLocations([]);
      setChosen(null);
      setNotice(result.warning ? `Location saved. ${result.warning}` : "Google Reviews connected.");
    });
  };

  const handleSync = () =>
    run("refresh", async () => {
      if (!outletId) return;
      setConnection(await refreshGoogleReviews(outletId));
      setNotice("Google rating and reviews refreshed.");
    });

  const handleDisconnect = () =>
    run("disconnect", async () => {
      if (!outletId) return;
      setConnection(await disconnectGoogleReviews(outletId));
      setSelectorOpen(false);
      setLocations([]);
      setChosen(null);
      setConfirmDisconnect(false);
      setNotice("Google Reviews disconnected.");
    });

  const status = connection?.status ?? "disconnected";
  const connected = status === "connected" || status === "error";
  const reconnect = status === "needs_reauth";
  const setupRequired = status === "setup_required";

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
        <Button onClick={handleConnect} disabled={busy === "connect"} fullWidth>
          {busy === "connect" ? "Opening Google…" : "Reconnect"}
        </Button>
      );
    }
    if (status === "pending_location") {
      return (
        <Button onClick={() => void openSelector(true)} disabled={busy === "locations"} fullWidth>
          {busy === "locations" ? "Loading locations…" : "Choose a location"}
        </Button>
      );
    }
    return (
      <Button onClick={handleConnect} disabled={busy === "connect"} fullWidth>
        {busy === "connect" ? "Opening Google…" : "Connect"}
      </Button>
    );
  };

  return (
    <div className="m-page-with-bottom-nav animate-fadeIn flex flex-col min-h-[calc(100dvh-8rem)]">
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
              <GoogleConnectionStatus connection={connection} />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <GoogleMark className="w-8 h-8" />
                  <p className="text-base font-semibold text-[var(--text-primary)]">Google Reviews</p>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Show customer feedback from your Google Business Profile directly on your BookGlow Booking Page.
                </p>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  Connect the Google Business Profile that belongs to this outlet. BookGlow will display its Google
                  rating and customer reviews on your Booking Page.
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
              Google Business Profile connection is currently unavailable. An administrator needs to add the Google
              credentials on the BookGlow server first.
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

        {canManage && !loading && !selectorOpen ? (
          <div className="sticky bottom-0 z-20 mt-auto pt-4 pb-[calc(0.75rem+var(--safe-bottom,0px))] bg-[var(--bg-canvas)] space-y-2">
            {connected ? (
              <Button variant="secondary" onClick={handleSync} disabled={busy === "refresh"} fullWidth>
                {busy === "refresh" ? "Syncing…" : "Sync now"}
              </Button>
            ) : null}
            {primaryAction()}
            <Button variant="outline" onClick={() => setTab("instructions")} fullWidth>
              Support article
            </Button>
          </div>
        ) : null}
      </div>

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
        onTryAnotherAccount={() => void handleConnect()}
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
    </div>
  );
};

export default GoogleReviewsIntegrationPage;
