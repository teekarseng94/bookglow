import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __setTelemetryEnabledForTests,
  approxJsonBytes,
  clearQueryMetrics,
  getQueryMetrics,
  recordQueryMetric,
  summarizeQueryMetrics,
} from "./queryTelemetry";

describe("queryTelemetry", () => {
  beforeEach(() => {
    __setTelemetryEnabledForTests(true);
    clearQueryMetrics();
  });

  afterEach(() => {
    __setTelemetryEnabledForTests(null);
    clearQueryMetrics();
  });

  it("estimates JSON payload size without exposing content helpers leaking PII APIs", () => {
    expect(approxJsonBytes([{ a: 1 }, { a: 2 }])).toBeGreaterThan(0);
  });

  it("summarizes by query and route", () => {
    recordQueryMetric({
      queryName: "clientService.listPage",
      resource: "clients",
      rowCount: 50,
      payloadBytes: 1000,
      durationMs: 20,
      trigger: "initial_load",
      route: "/member",
    });
    recordQueryMetric({
      queryName: "transactionService.getInDateRange",
      resource: "transactions",
      rowCount: 100,
      payloadBytes: 5000,
      durationMs: 40,
      trigger: "route_change",
      route: "/dashboard",
    });

    const summary = summarizeQueryMetrics();
    expect(summary.totalCalls).toBe(2);
    expect(summary.totalRows).toBe(150);
    expect(summary.totalBytes).toBe(6000);
    expect(getQueryMetrics()).toHaveLength(2);
    expect(summary.byRoute.some((r) => r.route === "/dashboard")).toBe(true);
  });
});
