import { describe, expect, it } from "vitest";
import { domainsForRoute } from "./outletDataDomains";

describe("domainsForRoute", () => {
  it("loads only catalog for POS", () => {
    expect([...domainsForRoute("pos")].sort()).toEqual(["catalog"]);
  });

  it("loads catalog for menu/settings", () => {
    expect([...domainsForRoute("menu")].sort()).toEqual(["catalog"]);
    expect([...domainsForRoute("settings")].sort()).toEqual(["catalog"]);
  });

  it("loads clients + transactions for members", () => {
    expect([...domainsForRoute("member")].sort()).toEqual([
      "catalog",
      "clients",
      "transactions",
    ]);
  });

  it("loads appointments range domains for schedule", () => {
    expect([...domainsForRoute("schedule")].sort()).toEqual([
      "appointments",
      "catalog",
      "clients",
    ]);
  });

  it("loads dashboard domains without full transactions (RPC KPIs)", () => {
    expect([...domainsForRoute("dashboard")].sort()).toEqual([
      "appointments",
      "catalog",
      "clients",
    ]);
  });
});
