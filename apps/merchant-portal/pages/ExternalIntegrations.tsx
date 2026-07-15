import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { OutletSettings, Client, Staff, Service } from '../types';
import { syncSetmoreViaCallable } from '../services/setmoreSyncService';
import { Icons } from '../constants';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Field } from '../components/ui/Field';

interface ExternalIntegrationsProps {
  settings: OutletSettings;
  onUpdateSettings: (settings: OutletSettings) => void | Promise<void>;
  currentOutletID: string;
  clients: Client[];
  staff: Staff[];
  services: Service[];
}

function formatTimeAgo(iso: string | undefined): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never';
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} minutes ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  return `${Math.floor(sec / 86400)} days ago`;
}

const ExternalIntegrations: React.FC<ExternalIntegrationsProps> = ({
  settings,
  onUpdateSettings,
  currentOutletID,
  clients,
  staff,
  services
}) => {
  const [feedUrl, setFeedUrl] = useState(settings.setmoreFeedUrl ?? '');
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSyncedCount, setLastSyncedCount] = useState<number | null>(null);

  const lastSyncedAt = settings.setmoreLastSyncedAt;
  const defaultStaffId = staff[0]?.id ?? '';
  const defaultServiceId = services[0]?.id ?? '';
  const hasFeed = Boolean((feedUrl || settings.setmoreFeedUrl || '').trim());

  const connectionTone = syncing
    ? 'info'
    : lastError
      ? 'danger'
      : lastSyncedAt
        ? 'success'
        : hasFeed
          ? 'warning'
          : 'neutral';

  const connectionLabel = syncing
    ? 'Syncing'
    : lastError
      ? 'Error'
      : lastSyncedAt
        ? 'Connected'
        : hasFeed
          ? 'Configured'
          : 'Disconnected';

  const handleSaveUrl = () => {
    onUpdateSettings({ ...settings, setmoreFeedUrl: feedUrl.trim() || undefined });
  };

  const handleSyncNow = async () => {
    if (!currentOutletID) {
      setLastError('No outlet selected.');
      return;
    }
    const url = (feedUrl || settings.setmoreFeedUrl || '').trim();
    setSyncing(true);
    setLastError(null);
    setLastSyncedCount(null);
    try {
      const result = await syncSetmoreViaCallable({
        feedUrl: url || undefined,
        outletID: currentOutletID,
        clients,
        defaultStaffId,
        defaultServiceId
      });
      const now = new Date().toISOString();
      onUpdateSettings({
        ...settings,
        setmoreFeedUrl: url || settings.setmoreFeedUrl,
        setmoreLastSyncedAt: now
      });
      setLastSyncedCount(result.synced);
      if (result.errors.length > 0) {
        setLastError(result.errors.slice(0, 3).join(' '));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastError(msg);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-20">
      <PageHeader
        title="External Integrations"
        description="Sync appointments from Setmore (ICS/iCal feed). Only real integrations are shown."
        actions={
          <Link
            to="/settings"
            className="p-2 rounded-xl border border-[var(--line)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
            aria-label="Back to Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        }
        meta={<StatusBadge tone={connectionTone as any}>{connectionLabel}</StatusBadge>}
      />

      <div className="bg-[var(--bg-surface)] p-6 sm:p-8 rounded-ui-lg border border-[var(--line)] shadow-ui-xs">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
            <Icons.Calendar />
          </div>
          <div className="min-w-0">
            <h3 className="text-app-section font-bold text-[var(--text-primary)]">Setmore Feed URL</h3>
            <p className="text-xs text-[var(--text-muted)] font-medium">
              Paste your Setmore ICS feed URL to import appointments.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Field id="setmore-feed-url" label="Setmore Feed URL">
            <input
              id="setmore-feed-url"
              type="url"
              placeholder="https://events.setmore.com/feeds/v1/…"
              className="w-full p-3 bg-[var(--bg-soft)] border border-[var(--line)] rounded-ui-md outline-none focus-visible:shadow-ui-focus-strong text-sm font-medium"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              onBlur={handleSaveUrl}
            />
          </Field>
          <p className="text-[10px] text-[var(--text-muted)] italic -mt-2">
            Optional. Leave blank to use the default feed. Find in Setmore: Settings → Calendar Sync → Copy iCal feed URL.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button type="button" onClick={handleSyncNow} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync Setmore Appointments'}
            </Button>
            <span className="text-sm text-[var(--text-secondary)] font-medium">
              Last synced: {formatTimeAgo(lastSyncedAt)}
              {lastSyncedCount != null && lastSyncedCount > 0 && (
                <span className="text-sky-600 ml-1">({lastSyncedCount} appointments)</span>
              )}
            </span>
          </div>

          {lastError && (
            <Alert tone="warning" title="Sync issue">
              {lastError}
            </Alert>
          )}
        </div>
      </div>

      <div className="bg-sky-50 p-6 rounded-ui-lg border border-sky-100">
        <h4 className="text-xs font-black uppercase text-sky-700 tracking-widest mb-3">How it works</h4>
        <ul className="text-sm text-sky-800 space-y-2 font-medium">
          <li>• Sync runs via a Firebase Cloud Function (no CORS). The feed is fetched server-side.</li>
          <li>• SUMMARY from the feed becomes customer name & service; we try to match existing members by name.</li>
          <li>• DTSTART/DTEND set appointment date and time.</li>
          <li>• Each event UID is used as the Firestore document ID so re-syncing updates instead of duplicating.</li>
          <li>• Imported appointments appear on the Calendar in light blue (Setmore).</li>
          <li>• Opening the Appointment page triggers an automatic sync once so staff always see the latest online bookings.</li>
        </ul>
      </div>
    </div>
  );
};

export default ExternalIntegrations;
