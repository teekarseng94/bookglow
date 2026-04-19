import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useUserContext } from '../contexts/UserContext';
import { apiIntegrationService } from '../services/firestoreService';
import { sha256Hex, generateApiKey } from '../utils/apiKeyHash';
import type { ApiIntegration } from '../types';

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
      <div className="max-w-4xl mx-auto p-8">
        <p className="text-slate-600">No outlet selected. Please sign in with an account linked to an outlet.</p>
        <Link to="/settings" className="mt-4 inline-block text-teal-600 font-medium hover:underline">Back to Settings</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 flex items-center justify-center min-h-[200px]">
        <div className="inline-block w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayKey = revealedKey ?? (integration?.keyPrefix ?? null);
  const hasStoredKey = Boolean(integration?.apiKeyHash);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-app-page sm:text-app-page-lg font-bold tracking-tight text-slate-900">API Integration Management</h1>
          <p className="text-slate-500 text-sm mt-1">Connect your chatbot (mychatbot.website) to this POS. Manage API key and webhook.</p>
        </div>
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Settings
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* API Key */}
      <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-app-section font-bold text-slate-900 mb-1">API Key</h2>
        <p className="text-slate-500 text-sm mb-4">Use this key in the <code className="bg-slate-100 px-1 rounded">X-API-Key</code> header. Send <code className="bg-slate-100 px-1 rounded">X-Outlet-Id</code> with your outlet ID for requests.</p>
        <div className="flex flex-wrap items-center gap-3">
          {displayKey ? (
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <input
                type="text"
                readOnly
                value={displayKey}
                className="flex-1 min-w-[200px] p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-700"
              />
              {revealedKey && (
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-teal-600 text-white font-medium text-sm hover:bg-teal-700 transition-colors"
                >
                  {copyStatus === 'ok' ? 'Copied!' : copyStatus === 'fail' ? 'Copy failed' : 'Copy to Clipboard'}
                </button>
              )}
              {hasStoredKey && !revealedKey && (
                <span className="text-slate-500 text-sm">Copy available only right after generate/regenerate. Store the key securely.</span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 text-sm">No key generated yet.</span>
          )}
          {!revealedKey && hasStoredKey && (
            <button
              type="button"
              onClick={() => setRegenerateConfirm(true)}
              disabled={keyAction !== 'idle'}
              className="px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 font-medium text-sm hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              Regenerate
            </button>
          )}
          {!hasStoredKey && (
            <button
              type="button"
              onClick={handleGenerateKey}
              disabled={keyAction !== 'idle'}
              className="px-4 py-3 rounded-xl bg-teal-600 text-white font-medium text-sm hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {keyAction === 'generate' ? 'Generating…' : 'Generate API Key'}
            </button>
          )}
        </div>
        {regenerateConfirm && (
          <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm">
            <p className="font-medium mb-2">Regenerating will revoke the current key. Any app using the old key will stop working. Continue?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRegenerateKey}
                disabled={keyAction !== 'idle'}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                Yes, regenerate
              </button>
              <button
                type="button"
                onClick={() => setRegenerateConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Webhook */}
      <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-app-section font-bold text-slate-900 mb-1">Webhook URL</h2>
        <p className="text-slate-500 text-sm mb-4">The POS can send events (e.g. new booking, status change) to this URL.</p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://mychatbot.website/webhook/zenspa"
            className="flex-1 min-w-[260px] p-3 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <button
            type="button"
            onClick={handleSaveWebhook}
            disabled={webhookSaving}
            className="px-4 py-3 rounded-xl bg-teal-600 text-white font-medium text-sm hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {webhookSaving ? 'Saving…' : webhookSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </section>

      {/* API Documentation Preview */}
      <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-app-section font-bold text-slate-900 mb-1">API Endpoints (Preview)</h2>
        <p className="text-slate-500 text-sm mb-4">Endpoints your chatbot can call. Include <code className="bg-slate-100 px-1 rounded">X-API-Key</code> and <code className="bg-slate-100 px-1 rounded">X-Outlet-Id</code> in headers.</p>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Method</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Path</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Description</th>
              </tr>
            </thead>
            <tbody>
              {API_DOCS.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 px-4">
                    <span className={`font-mono font-medium ${row.method === 'GET' ? 'text-emerald-600' : 'text-sky-600'}`}>
                      {row.method}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">{row.path}</td>
                  <td className="py-3 px-4 text-slate-600">{row.description}</td>
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
