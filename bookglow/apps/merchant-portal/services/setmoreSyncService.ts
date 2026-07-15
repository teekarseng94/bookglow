/**
 * Setmore ICS Feed Sync Service
 *
 * 1) Via Cloud Function (recommended): call syncSetmoreViaCallable to fetch ICS server-side,
 *    then save to Firestore with member matching and deduplication by UID.
 * 2) Client-side fallback: syncSetmoreFeed fetches and parses ICS in the browser (may hit CORS).
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';
import ICAL from 'ical.js';
import { appointmentService } from './firestoreService';
import type { Appointment } from '../types';
import type { Client } from '../types';

/** Firestore document IDs cannot contain / or .; sanitize UID for use as doc id */
export function sanitizeUidForDocId(uid: string): string {
  return uid
    .replace(/[/.#$[\]]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 1500) || `setmore_${Date.now()}`;
}

/** Find a client (member) whose name appears in the summary (case-insensitive, trimmed) */
export function findClientBySummary(clients: Client[], summary: string): Client | null {
  const normalized = summary.trim().toLowerCase();
  if (!normalized) return null;
  // Try exact match first
  const exact = clients.find((c) => c.name.trim().toLowerCase() === normalized);
  if (exact) return exact;
  // Try "summary starts with client name" or "client name is contained in summary"
  for (const c of clients) {
    const name = c.name.trim().toLowerCase();
    if (!name) continue;
    if (normalized.startsWith(name) || normalized.includes(name)) return c;
  }
  // Try first token of summary as name (e.g. "John Doe - Swedish Massage")
  const firstPart = normalized.split(/\s*[-–—:]\s*/)[0]?.trim();
  if (firstPart) {
    const byFirst = clients.find((c) => c.name.trim().toLowerCase() === firstPart);
    if (byFirst) return byFirst;
  }
  return null;
}

export interface SetmoreSyncOptions {
  feedUrl: string;
  outletID: string;
  clients: Client[];
  /** First staff id to use when no staff match (appointment still shows on calendar) */
  defaultStaffId: string;
  /** Placeholder service id when no service match */
  defaultServiceId: string;
}

export interface SetmoreSyncResult {
  success: boolean;
  synced: number;
  errors: string[];
}

/** Shape returned by the fetchSetmoreFeed Cloud Function (CORS proxy) */
export interface FetchSetmoreEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string;
}

/** Shape returned by the syncSetmoreCalendar Cloud Function */
export interface CallableAppointment {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string;
  outletID: string;
  source: string;
}

export interface SetmoreCallableSyncOptions {
  feedUrl?: string;
  outletID: string;
  clients: Client[];
  defaultStaffId: string;
  defaultServiceId: string;
}

/** Options for parsing ICS text and saving to Firestore (no fetch). */
export interface SetmoreFromIcsOptions {
  outletID: string;
  clients: Client[];
  defaultStaffId: string;
  defaultServiceId: string;
}

/**
 * Parse raw ICS text (e.g. from getSetmoreFeed proxy) and save appointments to Firestore
 * with UID as document ID (deduplication) and member auto-matching by title.
 */
export async function syncSetmoreFromIcsText(
  icsText: string,
  options: SetmoreFromIcsOptions
): Promise<SetmoreSyncResult> {
  const { outletID, clients, defaultStaffId, defaultServiceId } = options;
  const errors: string[] = [];
  let synced = 0;

  let vevents: ICAL.Component[];
  try {
    const jcal = ICAL.parse(icsText);
    const root = Array.isArray(jcal) && jcal[1] != null ? jcal[1] : jcal;
    const comp = new ICAL.Component(root as any);
    vevents = comp.getAllSubcomponents('vevent');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, synced: 0, errors: [`Failed to parse ICS: ${msg}`] };
  }

  for (const vevent of vevents) {
    try {
      const event = new ICAL.Event(vevent);
      const uid = event.uid;
      const summary = event.summary || '';
      const startDate = event.startDate?.toJSDate?.();
      const endDate = event.endDate?.toJSDate?.();

      if (!uid) {
        errors.push(`Event missing UID (skipped): ${summary.slice(0, 50)}`);
        continue;
      }
      if (!startDate || Number.isNaN(startDate.getTime())) {
        errors.push(`Event missing valid start date (skipped): ${summary.slice(0, 50)}`);
        continue;
      }

      const dateStr = startDate.toISOString().split('T')[0];
      const timeStr = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
      let endTimeStr: string | undefined;
      if (endDate && !Number.isNaN(endDate.getTime())) {
        endTimeStr = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      }

      const matchedClient = findClientBySummary(clients, summary);
      const clientId = matchedClient?.id ?? 'guest';

      const appointment: Omit<Appointment, 'id'> = {
        outletID,
        clientId,
        staffId: defaultStaffId,
        serviceId: defaultServiceId,
        date: dateStr,
        time: timeStr,
        endTime: endTimeStr,
        status: 'scheduled',
        source: 'setmore',
      };

      const docId = sanitizeUidForDocId(uid);
      await appointmentService.setWithId(docId, appointment, outletID);
      synced++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Event error: ${msg}`);
    }
  }

  return { success: errors.length === 0 || synced > 0, synced, errors };
}

/**
 * Save events from fetchSetmoreFeed (CORS proxy) into Firestore appointments.
 * Uses event.id (UID) as document ID to prevent duplicates.
 */
export async function saveSetmoreEventsToFirestore(
  events: FetchSetmoreEvent[],
  options: SetmoreFromIcsOptions
): Promise<SetmoreSyncResult> {
  const { outletID, clients, defaultStaffId, defaultServiceId } = options;
  const errors: string[] = [];
  let synced = 0;

  for (const ev of events) {
    try {
      const startDate = ev.start ? new Date(ev.start) : null;
      const endDate = ev.end ? new Date(ev.end) : null;
      if (!ev.id || !startDate || Number.isNaN(startDate.getTime())) {
        errors.push(`Invalid event (skipped): ${(ev.title || '').slice(0, 50)}`);
        continue;
      }

      const dateStr = startDate.toISOString().split('T')[0];
      const timeStr = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
      let endTimeStr: string | undefined;
      if (endDate && !Number.isNaN(endDate.getTime())) {
        endTimeStr = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      }

      const matchedClient = findClientBySummary(clients, ev.title || '');
      const clientId = matchedClient?.id ?? 'guest';

      const appointment: Omit<Appointment, 'id'> = {
        outletID,
        clientId,
        staffId: defaultStaffId,
        serviceId: defaultServiceId,
        date: dateStr,
        time: timeStr,
        endTime: endTimeStr,
        status: 'scheduled',
        source: 'setmore',
      };

      const docId = sanitizeUidForDocId(ev.id);
      await appointmentService.setWithId(docId, appointment, outletID);
      synced++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Event error: ${msg}`);
    }
  }

  return { success: errors.length === 0 || synced > 0, synced, errors };
}

/**
 * Call fetchSetmoreFeed Cloud Function (CORS proxy), then save returned events
 * into the appointments collection. Uses event UID as Firestore document ID to prevent duplicates.
 */
export async function syncSetmoreViaCallable(
  options: SetmoreCallableSyncOptions
): Promise<SetmoreSyncResult> {
  const { feedUrl, outletID, clients, defaultStaffId, defaultServiceId } = options;

  try {
    const functions = getFunctions(app, 'asia-southeast1');
    const fetchSetmoreFeed = httpsCallable<
      { feedUrl?: string },
      { success: boolean; events: FetchSetmoreEvent[] }
    >(functions, 'fetchSetmoreFeed');

    const result = await fetchSetmoreFeed({
      feedUrl: feedUrl?.trim() || undefined,
    });

    const data = result.data;
    if (!data?.success || !Array.isArray(data.events)) {
      return { success: false, synced: 0, errors: ['No events returned from Setmore feed.'] };
    }

    return saveSetmoreEventsToFirestore(data.events, {
      outletID,
      clients,
      defaultStaffId,
      defaultServiceId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, synced: 0, errors: [msg] };
  }
}

/**
 * Fetch ICS from URL, parse events, and upsert into Firestore appointments (dedupe by UID).
 * Maps: SUMMARY → customer/service text, DTSTART → date/time, DTEND → endTime, DESCRIPTION → staff/notes.
 * Tries to link appointment to a member by matching SUMMARY to client name.
 */
export async function syncSetmoreFeed(options: SetmoreSyncOptions): Promise<SetmoreSyncResult> {
  const { feedUrl, outletID, clients, defaultStaffId, defaultServiceId } = options;
  const errors: string[] = [];
  let synced = 0;

  if (!feedUrl?.trim()) {
    return { success: false, synced: 0, errors: ['Feed URL is required.'] };
  }

  let icsText: string;
  try {
    const res = await fetch(feedUrl.trim(), { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    icsText = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, synced: 0, errors: [`Failed to fetch feed: ${msg}. Check CORS if loading from another domain.`] };
  }

  let vevents: ICAL.Component[];
  try {
    const jcal = ICAL.parse(icsText);
    const root = Array.isArray(jcal) && jcal[1] != null ? jcal[1] : jcal;
    const comp = new ICAL.Component(root as any);
    vevents = comp.getAllSubcomponents('vevent');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, synced: 0, errors: [`Failed to parse ICS: ${msg}`] };
  }
  for (const vevent of vevents) {
    try {
      const event = new ICAL.Event(vevent);
      const uid = event.uid;
      const summary = event.summary || '';
      const description = event.description || '';
      const startDate = event.startDate?.toJSDate?.();
      const endDate = event.endDate?.toJSDate?.();

      if (!uid) {
        errors.push(`Event missing UID (skipped): ${summary.slice(0, 50)}`);
        continue;
      }
      if (!startDate || Number.isNaN(startDate.getTime())) {
        errors.push(`Event missing valid start date (skipped): ${summary.slice(0, 50)}`);
        continue;
      }

      const dateStr = startDate.toISOString().split('T')[0];
      const timeStr = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
      let endTimeStr: string | undefined;
      if (endDate && !Number.isNaN(endDate.getTime())) {
        endTimeStr = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      }

      const matchedClient = findClientBySummary(clients, summary);
      const clientId = matchedClient?.id ?? 'guest';

      const appointment: Omit<Appointment, 'id'> = {
        outletID,
        clientId,
        staffId: defaultStaffId,
        serviceId: defaultServiceId,
        date: dateStr,
        time: timeStr,
        endTime: endTimeStr,
        status: 'scheduled',
        source: 'setmore',
      };

      const docId = sanitizeUidForDocId(uid);
      await appointmentService.setWithId(docId, appointment, outletID);
      synced++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Event error: ${msg}`);
    }
  }

  return { success: errors.length === 0 || synced > 0, synced, errors };
}
