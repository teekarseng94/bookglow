const CLOSED = new Set(["cancelled", "no-show", "no_show", "canceled"]);

export function parseMinutes(hhmm: string | undefined | null): number | null {
  if (!hhmm) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatMinutes(total: number): string {
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function endMinutes(
  start: string,
  end: string | undefined,
  durationMinutes: number | undefined,
): number | null {
  const startMin = parseMinutes(start);
  if (startMin == null) return null;
  const explicitEnd = parseMinutes(end);
  if (explicitEnd != null && explicitEnd > startMin) return explicitEnd;
  const duration = durationMinutes && durationMinutes > 0 ? durationMinutes : 30;
  return startMin + duration;
}

export interface BookingWindow {
  id?: string;
  staffId?: string;
  date: string;
  time: string;
  endTime?: string;
  status?: string;
  durationMinutes?: number;
}

export function staffBookingConflicts(candidate: BookingWindow, existing: readonly BookingWindow[]): boolean {
  if (!candidate.staffId) return false;
  const start = parseMinutes(candidate.time);
  const end = endMinutes(candidate.time, candidate.endTime, candidate.durationMinutes);
  if (start == null || end == null) return false;

  return existing.some((other) => {
    if (candidate.id && other.id && candidate.id === other.id) return false;
    if (!other.staffId || other.staffId !== candidate.staffId) return false;
    if (other.date !== candidate.date) return false;
    if (CLOSED.has((other.status || "").toLowerCase())) return false;
    const otherStart = parseMinutes(other.time);
    const otherEnd = endMinutes(other.time, other.endTime, other.durationMinutes);
    if (otherStart == null || otherEnd == null) return false;
    return start < otherEnd && otherStart < end;
  });
}
