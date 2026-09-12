import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const getGoogleConnection = vi.hoisted(() => vi.fn());
const getApi = vi.hoisted(() => vi.fn());

vi.mock("../contexts/UserContext", () => ({
  useUserContext: () => ({
    outletId: "outlet_002",
    role: "admin",
    outletName: "Sohokaki",
    userData: null,
    loading: false,
  }),
}));

vi.mock("../services/googleReviewsService", () => ({
  getGoogleConnection,
}));

vi.mock("../services/databaseService", () => ({
  apiIntegrationService: { get: getApi },
}));

import IntegrationsPage from "./Integrations";

beforeEach(() => {
  getGoogleConnection.mockReset();
  getApi.mockReset();
  getGoogleConnection.mockResolvedValue({ status: "disconnected", showOnBookingPage: false });
  getApi.mockResolvedValue(null);
});

describe("Integrations page", () => {
  it("renders BookGlow integrations and not invented Setmore providers", async () => {
    render(
      <MemoryRouter>
        <IntegrationsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Integrations" })).toBeTruthy();
    expect(await screen.findByText("Google Reviews")).toBeTruthy();
    expect(screen.getByText("Chatbot API Integration")).toBeTruthy();
    expect(screen.queryByText("LawPay")).toBeNull();
    expect(screen.queryByText("Trustpilot")).toBeNull();
    expect(screen.queryByText("Setmore Reviews")).toBeNull();
  });

  it("shows a Connected badge when Google Reviews is connected", async () => {
    getGoogleConnection.mockResolvedValue({ status: "connected", showOnBookingPage: true });
    render(
      <MemoryRouter>
        <IntegrationsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Connected")).toBeTruthy();
  });
});
