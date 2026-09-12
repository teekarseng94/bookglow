import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUserContext } from "../contexts/UserContext";
import { apiIntegrationService } from "../services/databaseService";
import { generateApiKey, sha256Hex } from "../utils/apiKeyHash";
import type { ApiIntegration } from "../types";
import { Button } from "../components/ui/Button";
import { Field, fieldControlClassName } from "../components/ui/Field";
import { FormSection } from "../components/ui/FormSection";
import { ConfirmationDialog } from "../components/ui/ConfirmationDialog";
import { IntegrationStatusBadge } from "../components/integrations/IntegrationStatusBadge";

const CHATBOT_WEBHOOK_URL = "https://uecphpjymbgtttrizhgy.supabase.co/functions/v1/chatbot-webhook";

const ChatbotApiIntegrationPage: React.FC = () => {
  const { outletId } = useUserContext();
  const effectiveOutletId = outletId ?? "";

  const [integration, setIntegration] = useState<ApiIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copyField, setCopyField] = useState<"outlet" | "key" | "webhook" | null>(null);
  const [regenerateConfirm, setRegenerateConfirm] = useState(false);

  const load = useCallback(async () => {
    if (!effectiveOutletId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setIntegration(await apiIntegrationService.get(effectiveOutletId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The chatbot API settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [effectiveOutletId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleGenerate = async () => {
    if (!effectiveOutletId) return;
    setBusy(true);
    setError(null);
    setRevealedKey(null);
    try {
      const rawKey = generateApiKey();
      const hash = await sha256Hex(rawKey);
      const prefix = rawKey.slice(0, 12) + "...";
      await apiIntegrationService.setApiKey(effectiveOutletId, hash, prefix, effectiveOutletId);
      setRevealedKey(rawKey);
      setIntegration((prev) => ({
        ...(prev || { outletID: effectiveOutletId }),
        outletID: effectiveOutletId,
        apiKeyHash: hash,
        keyPrefix: prefix,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The API key could not be generated.");
    } finally {
      setBusy(false);
      setRegenerateConfirm(false);
    }
  };

  const handleCopy = async (value: string, field: "outlet" | "key" | "webhook") => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyField(field);
      window.setTimeout(() => setCopyField(null), 2000);
    } catch {
      setCopyField(null);
    }
  };

  const connected = Boolean(integration?.apiKeyHash);

  return (
    <div className="m-page-with-bottom-nav animate-fadeIn">
      <div className="max-w-xl mx-auto w-full">
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
          <h1 className="ui-page-title text-lg sm:text-xl min-w-0">Chatbot API Integration</h1>
          <IntegrationStatusBadge status={connected ? "connected" : "disconnected"} />
        </div>

        <p className="text-sm text-[var(--text-muted)] mb-6">
          Connect your chatbot or external automation to this BookGlow outlet.
        </p>

        {error ? (
          <p role="alert" className="mb-4 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="space-y-2" aria-hidden>
            <div className="h-10 rounded bg-[var(--line-soft,#eee)] animate-pulse" />
            <div className="h-10 rounded bg-[var(--line-soft,#eee)] animate-pulse" />
          </div>
        ) : (
          <FormSection>
            <Field id="chatbot-outlet-id" label="Outlet ID">
              <div className="flex gap-2 min-w-0">
                <input
                  id="chatbot-outlet-id"
                  type="text"
                  readOnly
                  value={effectiveOutletId}
                  className={`${fieldControlClassName} flex-1 font-mono min-w-0`}
                />
                <Button variant="secondary" size="sm" onClick={() => handleCopy(effectiveOutletId, "outlet")}>
                  {copyField === "outlet" ? "Copied" : "Copy"}
                </Button>
              </div>
            </Field>

            <Field
              id="chatbot-api-key"
              label="API Access Key"
              hint={
                <>
                  Use this in the <code className="bg-[var(--bg-soft)] px-1 rounded">X-API-Key</code> header. We never
                  store the raw key, only its hash.
                </>
              }
            >
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 min-w-0">
                  <input
                    id="chatbot-api-key"
                    type="text"
                    readOnly
                    value={revealedKey || integration?.keyPrefix || "No key generated yet."}
                    className={`${fieldControlClassName} flex-1 font-mono min-w-0`}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => revealedKey && handleCopy(revealedKey, "key")}
                    disabled={!revealedKey}
                  >
                    {copyField === "key" ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            </Field>

            <Field
              id="chatbot-webhook-url"
              label="Webhook URL"
              hint="Your chatbot can call this endpoint to verify the key and talk to BookGlow."
            >
              <div className="flex gap-2 min-w-0">
                <input
                  id="chatbot-webhook-url"
                  type="text"
                  readOnly
                  value={CHATBOT_WEBHOOK_URL}
                  className={`${fieldControlClassName} flex-1 font-mono text-xs min-w-0`}
                />
                <Button variant="secondary" size="sm" onClick={() => handleCopy(CHATBOT_WEBHOOK_URL, "webhook")}>
                  {copyField === "webhook" ? "Copied" : "Copy"}
                </Button>
              </div>
            </Field>

            <Button
              onClick={connected ? () => setRegenerateConfirm(true) : () => void handleGenerate()}
              disabled={busy}
              fullWidth
            >
              {connected ? (busy ? "Regenerating…" : "Regenerate key") : busy ? "Generating…" : "Generate API key"}
            </Button>
          </FormSection>
        )}
      </div>

      <ConfirmationDialog
        open={regenerateConfirm}
        onClose={() => setRegenerateConfirm(false)}
        onConfirm={() => void handleGenerate()}
        busy={busy}
        tone="danger"
        title="Regenerate API key?"
        description="The current key will stop working immediately. Update your chatbot with the new key."
        confirmLabel="Regenerate"
      />
    </div>
  );
};

export default ChatbotApiIntegrationPage;
