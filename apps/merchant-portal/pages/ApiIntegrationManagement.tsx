import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useUserContext } from '../contexts/UserContext';
import { apiIntegrationService } from '../services/databaseService';
import { sha256Hex, generateApiKey } from '../utils/apiKeyHash';
import type { ApiIntegration } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';

const API_DOCS = [
  { method: 'GET', path: '/api/v1/availability', description: 'Get available time slots for a date' },
  { method: 'POST', path: '/api/v1/bookings', description: 'Create a booking' },
  { method: 'GET', path: '/api/v1/services', description: 'List services (public)' },
  { method: 'GET', path: '/api/v1/outlet', description: 'Get outlet info (name, hours)' },
];

const ApiIntegrationManagement: React.FC = () => {
  const { outletId } = useUserContext();
  const effectiveOutletId = outletId ?? '';

  const [integration, setIntegration] = useState<ApiIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyAction, setKeyAction] = useState<'idle' | 'generate' | 'regenerate'>('idle');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [regenerateConfirm, setRegenerateConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!effectiveOutletId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiIntegrationService.get(effectiveOutletId);
      setIntegration(data);
      setWebhookUrl(data?.webhookUrl ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [effectiveOutletId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerateKey = async () => {
    if (!effectiveOutletId) return;
    setKeyAction('generate');
    setError(null);
    setRevealedKey(null);
    try {
      const rawKey = generateApiKey();
      const hash = await sha256Hex(rawKey);
      const prefix = rawKey.slice(0, 12) + '...';
      await apiIntegrationService.setApiKey(effectiveOutletId, hash, prefix, effectiveOutletId);
      setRevealedKey(rawKey);
      setIntegration((prev) => ({ ...prev, outletID: effectiveOutletId, apiKeyHash: hash, keyPrefix: prefix }));
    } catch (e) {
      console.error('[ApiIntegrationManagement] Generate API Key failed:', e);
      if (e && typeof e === 'object' && 'code' in e) {
        console.error('[ApiIntegrationManagement] Firebase error code:', (e as { code?: string }).code);
      }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setKeyAction('idle');
    }
  };

  const handleRegenerateKey = async () => {
    if (!effectiveOutletId || !regenerateConfirm) return;
    setRegenerateConfirm(false);
    setKeyAction('regenerate');
    setError(null);
    setRevealedKey(null);
    try {
      const rawKey = generateApiKey();
      const hash = await sha256Hex(rawKey);
      const prefix = rawKey.slice(0, 12) + '...';
      await apiIntegrationService.setApiKey(effectiveOutletId, hash, prefix, effectiveOutletId);
      setRevealedKey(rawKey);
      setIntegration((prev) => ({ ...prev, outletID: effectiveOutletId, apiKeyHash: hash, keyPrefix: prefix }));
    } catch (e) {
      console.error('[ApiIntegrationManagement] Regenerate API Key failed:', e);
      if (e && typeof e === 'object' && 'code' in e) {
        console.error('[ApiIntegrationManagement] Firebase error code:', (e as { code?: string }).code);
      }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setKeyAction('idle');
    }
  };

  const handleCopyKey = async () => {
    if (!revealedKey) {
      setCopyStatus('fail');
      setTimeout(() => setCopyStatus('idle'), 2000);
      return;
    }
    try {
      await navigator.clipboard.writeText(revealedKey);
      setCopyStatus('ok');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('fail');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const handleSaveWebhook = async () => {
    if (!effectiveOutletId) return;
    setWebhookSaving(true);
    setWebhookSaved(false);
    setError(null);
    try {
      await apiIntegrationService.setWebhookUrl(effectiveOutletId, webhookUrl, effectiveOutletId);
      setIntegration((prev) => ({ ...prev, outletID: effectiveOutletId, webhookUrl: webhookUrl.trim() || undefined }));
      setWebhookSaved(true);
      setTimeout(() => setWebhookSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWebhookSaving(false);
    }
  };

  if (!effectiveOutletId) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-4">
        <Alert tone="warning" title="No outlet selected">
          Please sign in with an account linked to an outlet.
        </Alert>
        <Link to="/settings" className="inline-block text-[var(--brand)] font-medium hover:underline">
          Back to Settings
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  const displayKey = revealedKey ?? (integration?.keyPrefix ?? null);
  const hasStoredKey = Boolean(integration?.apiKeyHash);
  const keyStatus = keyAction !== 'idle'
    ? 'loading'
    : error
      ? 'error'
      : hasStoredKey
        ? 'connected'
        : 'disconnected';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
      <PageHeader
        title="API Integration Management"
        description="Connect your chatbot to this POS. Manage API key and webhook. Key generation and hashing behavior is unchanged."
        actions={
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] text-[var(--text-secondary)] font-medium text-sm hover:bg-[var(--bg-soft)]"
          >
            Back to Settings
          </Link>
        }
        meta={
          <StatusBadge
            tone={
              keyStatus === 'loading'
                ? 'info'
                : keyStatus === 'error'
                  ? 'danger'
                  : keyStatus === 'connected'
                    ? 'success'
                    : 'neutral'
            }
          >
            {keyStatus === 'loading'
              ? 'Working…'
              : keyStatus === 'error'
                ? 'Error'
                : keyStatus === 'connected'
                  ? 'Key connected'
                  : 'No key'}
          </StatusBadge>
        }
      />

      {error && (
        <Alert tone="danger" title="API error">
          {error}
        </Alert>
      )}

      {/* API Key */}
      <section className="bg-[var(--bg-surface)] p-6 sm:p-8 rounded-ui-lg border border-[var(--line)] shadow-ui-xs">
        <h2 className="text-app-section font-bold text-[var(--text-primary)] mb-1">API Key</h2>
        <p className="text-[var(--text-secondary)] text-sm mb-4">
          Use this key in the <code className="bg-[var(--bg-soft)] px-1 rounded">X-API-Key</code> header. Send{' '}
          <code className="bg-[var(--bg-soft)] px-1 rounded">X-Outlet-Id</code> with your outlet ID for requests.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {displayKey ? (
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <input
                type="text"
                readOnly
                value={displayKey}
                className="flex-1 min-w-[200px] p-3 bg-[var(--bg-soft)] border border-[var(--line)] rounded-ui-md text-sm font-mono text-[var(--text-secondary)]"
              />
              {revealedKey && (
                <Button type="button" onClick={handleCopyKey}>
                  {copyStatus === 'ok' ? 'Copied!' : copyStatus === 'fail' ? 'Copy failed' : 'Copy to Clipboard'}
                </Button>
              )}
              {hasStoredKey && !revealedKey && (
                <span className="text-[var(--text-muted)] text-sm">
                  Copy available only right after generate/regenerate. Store the key securely.
                </span>
              )}
            </div>
          ) : (
            <span className="text-[var(--text-muted)] text-sm">No key generated yet.</span>
          )}
          {!revealedKey && hasStoredKey && (
            <Button type="button" variant="outline" onClick={() => setRegenerateConfirm(true)} disabled={keyAction !== 'idle'}>
              Regenerate
            </Button>
          )}
          {!hasStoredKey && (
            <Button type="button" onClick={handleGenerateKey} disabled={keyAction !== 'idle'}>
              {keyAction === 'generate' ? 'Generating…' : 'Generate API Key'}
            </Button>
          )}
        </div>
        <ConfirmationDialog
          open={regenerateConfirm}
          onClose={() => setRegenerateConfirm(false)}
          onConfirm={handleRegenerateKey}
          busy={keyAction === 'regenerate'}
          tone="danger"
          title="Regenerate API key?"
          description="Regenerating will revoke the current key. Any app using the old key will stop working."
          confirmLabel="Yes, regenerate"
        />
      </section>

      {/* Webhook */}
      <section className="bg-[var(--bg-surface)] p-6 sm:p-8 rounded-ui-lg border border-[var(--line)] shadow-ui-xs">
        <h2 className="text-app-section font-bold text-[var(--text-primary)] mb-1">Webhook URL</h2>
        <p className="text-[var(--text-secondary)] text-sm mb-4">
          The POS can send events (e.g. new booking, status change) to this URL.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-webhook.example/events"
            className="flex-1 min-w-[260px] p-3 border border-[var(--line)] rounded-ui-md text-sm text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] focus-visible:shadow-ui-focus-strong outline-none"
          />
          <Button type="button" onClick={handleSaveWebhook} disabled={webhookSaving}>
            {webhookSaving ? 'Saving…' : webhookSaved ? 'Saved' : 'Save'}
          </Button>
        </div>
      </section>

      {/* API Documentation Preview */}
      <section className="bg-[var(--bg-surface)] p-6 sm:p-8 rounded-ui-lg border border-[var(--line)] shadow-ui-xs">
        <h2 className="text-app-section font-bold text-[var(--text-primary)] mb-1">API Endpoints (Preview)</h2>
        <p className="text-[var(--text-secondary)] text-sm mb-4">
          Endpoints your chatbot can call. Include <code className="bg-[var(--bg-soft)] px-1 rounded">X-API-Key</code> and{' '}
          <code className="bg-[var(--bg-soft)] px-1 rounded">X-Outlet-Id</code> in headers.
        </p>
        <div className="overflow-x-auto rounded-ui-md border border-[var(--line)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-soft)] border-b border-[var(--line)]">
                <th className="text-left py-3 px-4 font-semibold text-[var(--text-secondary)]">Method</th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--text-secondary)]">Path</th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--text-secondary)]">Description</th>
              </tr>
            </thead>
            <tbody>
              {API_DOCS.map((row, i) => (
                <tr key={i} className="border-b border-[var(--line)] last:border-0">
                  <td className="py-3 px-4">
                    <span className={`font-mono font-medium ${row.method === 'GET' ? 'text-emerald-600' : 'text-sky-600'}`}>
                      {row.method}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">{row.path}</td>
                  <td className="py-3 px-4 text-[var(--text-muted)]">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ApiIntegrationManagement;
