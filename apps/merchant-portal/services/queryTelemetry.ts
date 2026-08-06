/**
 * Development-only Supabase query telemetry.
 * Records metadata only — never tokens, emails, phones, notes, or row content.
 *
 * Enable:
 * - Vite DEV mode (default on), or
 * - VITE_EGRESS_TELEMETRY=true
 *
 * Inspect in browser console:
 *   window.__bookglowQueryMetrics.summary()
 *   window.__bookglowQueryMetrics.dump()
 */

export type QueryTrigger =
  | "initial_load"
  | "route_change"
  | "focus"
  | "reconnect"
  | "realtime_event"
  | "manual_refresh"
  | "pagination"
  | "search"
  | "poll"
  | "unknown";

export interface QueryMetric {
  queryName: string;
  route: string;
  resource: string;
  rowCount: number;
  payloadBytes: number;
  durationMs: number;
  trigger: QueryTrigger;
  cacheHit?: boolean;
  channelName?: string;
  at: number;
}

export interface RecordQueryMetricInput {
  queryName: string;
  route?: string;
  resource: string;
  rowCount: number;
  payloadBytes?: number;
  durationMs: number;
  trigger?: QueryTrigger;
  cacheHit?: boolean;
  channelName?: string;
}

const MAX_EVENTS = 500;
const events: QueryMetric[] = [];
let currentRoute = typeof window !== "undefined" ? window.location.hash || window.location.pathname : "";
let currentTrigger: QueryTrigger = "unknown";

let forceEnabledForTests: boolean | null = null;

function isTelemetryEnabled(): boolean {
  if (forceEnabledForTests != null) return forceEnabledForTests;
  try {
    const env = import.meta.env as unknown as Record<string, string | undefined>;
    if (env.VITE_EGRESS_TELEMETRY === "false") return false;
    if (env.VITE_EGRESS_TELEMETRY === "true") return true;
    return Boolean(env.DEV);
  } catch {
    return false;
  }
}

/** Test-only override. Pass null to restore env-based detection. */
export function __setTelemetryEnabledForTests(enabled: boolean | null): void {
  forceEnabledForTests = enabled;
}

/** Approximate UTF-8 JSON byte size without logging content. */
export function approxJsonBytes(value: unknown): number {
  try {
    if (value == null) return 0;
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return 0;
  }
}

export function setTelemetryRoute(route: string): void {
  currentRoute = route || currentRoute;
}

export function setTelemetryTrigger(trigger: QueryTrigger): void {
  currentTrigger = trigger;
}

export function getTelemetryTrigger(): QueryTrigger {
  return currentTrigger;
}

export function recordQueryMetric(input: RecordQueryMetricInput): void {
  if (!isTelemetryEnabled()) return;

  const metric: QueryMetric = {
    queryName: input.queryName,
    route: input.route || currentRoute || "unknown",
    resource: input.resource,
    rowCount: Math.max(0, Number(input.rowCount) || 0),
    payloadBytes: Math.max(0, Number(input.payloadBytes) || 0),
    durationMs: Math.max(0, Number(input.durationMs) || 0),
    trigger: input.trigger || currentTrigger || "unknown",
    cacheHit: input.cacheHit,
    channelName: input.channelName,
    at: Date.now(),
  };

  events.push(metric);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);

  // Compact one-line log — no PII
  // eslint-disable-next-line no-console
  console.debug(
    `[egress] ${metric.queryName} ${metric.resource} rows=${metric.rowCount} bytes≈${metric.payloadBytes} ${metric.durationMs}ms trigger=${metric.trigger} route=${metric.route}`,
  );
}

/** Wrap an async query and record timing/size. */
export async function withQueryTelemetry<T>(
  input: {
    queryName: string;
    resource: string;
    trigger?: QueryTrigger;
    route?: string;
    channelName?: string;
    rowCount?: (result: T) => number;
    payload?: (result: T) => unknown;
  },
  run: () => Promise<T>,
): Promise<T> {
  const started = performance.now();
  try {
    const result = await run();
    if (isTelemetryEnabled()) {
      const rows =
        typeof input.rowCount === "function"
          ? input.rowCount(result)
          : Array.isArray(result)
            ? result.length
            : result == null
              ? 0
              : 1;
      const payloadSource = input.payload ? input.payload(result) : result;
      recordQueryMetric({
        queryName: input.queryName,
        resource: input.resource,
        rowCount: rows,
        payloadBytes: approxJsonBytes(payloadSource),
        durationMs: Math.round(performance.now() - started),
        trigger: input.trigger,
        route: input.route,
        channelName: input.channelName,
      });
    }
    return result;
  } catch (error) {
    if (isTelemetryEnabled()) {
      recordQueryMetric({
        queryName: `${input.queryName}:error`,
        resource: input.resource,
        rowCount: 0,
        payloadBytes: 0,
        durationMs: Math.round(performance.now() - started),
        trigger: input.trigger,
        route: input.route,
      });
    }
    throw error;
  }
}

export function getQueryMetrics(): QueryMetric[] {
  return events.slice();
}

export function clearQueryMetrics(): void {
  events.length = 0;
}

export function summarizeQueryMetrics(): {
  byQuery: Array<{
    queryName: string;
    resource: string;
    calls: number;
    rows: number;
    bytes: number;
    avgMs: number;
  }>;
  byRoute: Array<{ route: string; calls: number; bytes: number; rows: number }>;
  totalCalls: number;
  totalBytes: number;
  totalRows: number;
} {
  const byQueryMap = new Map<
    string,
    { queryName: string; resource: string; calls: number; rows: number; bytes: number; ms: number }
  >();
  const byRouteMap = new Map<string, { route: string; calls: number; bytes: number; rows: number }>();

  for (const e of events) {
    const qk = `${e.queryName}|${e.resource}`;
    const q = byQueryMap.get(qk) || {
      queryName: e.queryName,
      resource: e.resource,
      calls: 0,
      rows: 0,
      bytes: 0,
      ms: 0,
    };
    q.calls += 1;
    q.rows += e.rowCount;
    q.bytes += e.payloadBytes;
    q.ms += e.durationMs;
    byQueryMap.set(qk, q);

    const r = byRouteMap.get(e.route) || { route: e.route, calls: 0, bytes: 0, rows: 0 };
    r.calls += 1;
    r.bytes += e.payloadBytes;
    r.rows += e.rowCount;
    byRouteMap.set(e.route, r);
  }

  const byQuery = Array.from(byQueryMap.values())
    .map((q) => ({
      queryName: q.queryName,
      resource: q.resource,
      calls: q.calls,
      rows: q.rows,
      bytes: q.bytes,
      avgMs: q.calls ? Math.round(q.ms / q.calls) : 0,
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const byRoute = Array.from(byRouteMap.values()).sort((a, b) => b.bytes - a.bytes);

  return {
    byQuery,
    byRoute,
    totalCalls: events.length,
    totalBytes: events.reduce((s, e) => s + e.payloadBytes, 0),
    totalRows: events.reduce((s, e) => s + e.rowCount, 0),
  };
}

declare global {
  interface Window {
    __bookglowQueryMetrics?: {
      dump: () => QueryMetric[];
      summary: () => ReturnType<typeof summarizeQueryMetrics>;
      clear: () => void;
      setRoute: (route: string) => void;
      setTrigger: (trigger: QueryTrigger) => void;
    };
  }
}

export function installQueryMetricsGlobal(): void {
  if (!isTelemetryEnabled() || typeof window === "undefined") return;
  window.__bookglowQueryMetrics = {
    dump: getQueryMetrics,
    summary: summarizeQueryMetrics,
    clear: clearQueryMetrics,
    setRoute: setTelemetryRoute,
    setTrigger: setTelemetryTrigger,
  };
}
