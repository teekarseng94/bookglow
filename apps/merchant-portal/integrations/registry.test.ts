import { describe, expect, it } from "vitest";
import { googleRedirectNotice, merchantGoogleError } from "./googleErrors";
import { INTEGRATION_REGISTRY } from "./registry";

describe("integration registry", () => {
  it("only lists integrations BookGlow actually supports", () => {
    expect(INTEGRATION_REGISTRY.map((item) => item.id).sort()).toEqual(["chatbot-api", "google-reviews"]);
    expect(INTEGRATION_REGISTRY.find((item) => item.id === "google-reviews")?.route).toBe(
      "/integrations/google-reviews",
    );
  });
});

describe("merchant Google errors", () => {
  it("never returns raw API JSON", () => {
    expect(merchantGoogleError('{"error":{"code":403}}')).toMatch(/currently unavailable/i);
    expect(merchantGoogleError("PERMISSION_DENIED SERVICE_DISABLED")).toMatch(/currently unavailable/i);
  });

  it("maps OAuth cancellation", () => {
    expect(googleRedirectNotice("cancelled", null).error).toBe("Google connection was cancelled.");
    expect(googleRedirectNotice("select_location", null).openSelector).toBe(true);
  });
});
