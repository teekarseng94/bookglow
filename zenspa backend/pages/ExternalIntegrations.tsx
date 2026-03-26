import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { OutletSettings, Client, Staff, Service } from '../types';
import { syncSetmoreViaCallable } from '../services/setmoreSyncService';
import { Icons } from '../constants';

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
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
      <div className="flex items-center gap-4">
        <Link
          to="/settings"
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="Back to Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">External Integrations</h2>
          <p className="text-slate-500 text-sm">Sync appointments from Setmore (ICS/iCal feed).</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
            <Icons.Calendar />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Setmore Feed URL</h3>
            <p className="text-xs text-slate-400 font-medium">Paste your Setmore ICS feed URL to import appointments.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
              Setmore Feed URL
            </label>
            <input
              type="url"
              placeholder="https://events.setmore.com/feeds/v1/NDYxYTA2YWE1ODllODMxYw=="
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              onBlur={handleSaveUrl}
            />
            <p className="text-[10px] text-slate-400 mt-2 italic">
              Optional. Leave blank to use the default feed. Find in Setmore: Settings → Calendar Sync → Copy iCal feed URL.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncing}
              className="px-6 py-3 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Syncing…
                </>
              ) : (
                <>Sync Setmore Appointments</>
              )}
            </button>
            <span className="text-sm text-slate-500 font-medium">
              Last synced: {formatTimeAgo(lastSyncedAt)}
              {lastSyncedCount != null && lastSyncedCount > 0 && (
                <span className="text-sky-600 ml-1">({lastSyncedCount} appointments)</span>
              )}
            </span>
          </div>

          {lastError && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              {lastError}
            </div>
          )}
        </div>
      </div>

      <div className="bg-sky-50 p-6 rounded-2xl border border-sky-100">
        <h4 className="text-xs font-black uppercase text-sky-700 tracking-widest mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How it works
        </h4>
        <ul className="text-sm text-sky-800 space-y-2 font-medium">
          <li>• Sync runs via a Firebase Cloud Function (no CORS). The feed is fetched server-side.</li>
          <li>• SUMMARY from the feed becomes customer name & service; we try to match existing members by name.</li>
          <li>• DTSTART/DTEND set appointment date and time.</li>
          <li>• Each event UID is used as the Firestore document ID so re-syncing updates instead of duplicating.</li>
          <li>• Imported appointments appear on the Calendar in <span className="bg-sky-200/60 px-1 rounded">light blue</span> (Setmore).</li>
          <li>• Opening the Appointment page triggers an automatic sync once so staff always see the latest online bookings.</li>
        </ul>
      </div>
    </div>
  );
};

export default ExternalIntegrations;
