import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const getGoogleConnection = vi.hoisted(() => vi.fn());
const startGoogleAuthorization = vi.hoisted(() => vi.fn());
const listGoogleLocations = vi.hoisted(() => vi.fn());
const selectGoogleLocation = vi.hoisted(() => vi.fn());
const disconnectGoogleReviews = vi.hoisted(() => vi.fn());
const refreshGoogleReviews = vi.hoisted(() => vi.fn());

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
  startGoogleAuthorization,
  listGoogleLocations,
  selectGoogleLocation,
  disconnectGoogleReviews,
  refreshGoogleReviews,
}));

import GoogleReviewsIntegrationPage from "./GoogleReviewsIntegrationPage";

const disconnected = {
  configured: true,
  missingConfig: [],
  status: "disconnected",
  showOnBookingPage: false,
};

const connected = {
  ...disconnected,
  status: "connected",
  locationTitle: "Sohokaki Wellness Center",
  locationAddress: "Lot F14, Kuala Lumpur",
  averageRating: 4.8,
  totalReviewCount: 194,
  lastSyncedAt: "2026-09-12T08:00:00.000Z",
  showOnBookingPage: true,
};

beforeEach(() => {
  getGoogleConnection.mockReset();
  startGoogleAuthorization.mockReset();
  listGoogleLocations.mockReset();
  selectGoogleLocation.mockReset();
  disconnectGoogleReviews.mockReset();
  refreshGoogleReviews.mockReset();
  getGoogleConnection.mockResolvedValue(disconnected);
  startGoogleAuthorization.mockResolvedValue("https://accounts.google.com/o/oauth2/v2/auth?state=abc");
  window.history.replaceState(null, "", "/");
});

function renderPage() {
  return render(
    <MemoryRouter>
      <GoogleReviewsIntegrationPage />
    </MemoryRouter>,
  );
}

describe("Google Reviews integration page", () => {
  it("renders About and Instructions tabs in the disconnected state", async () => {
    renderPage();
    expect(await screen.findByRole("button", { name: "Connect" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Instructions" }));
    expect(screen.getByText(/Click the Connect button/i)).toBeTruthy();
    expect(screen.queryByLabelText("Google Maps listing URL")).toBeNull();
  });

  it("starts Google OAuth from Connect", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { ...window.location, assign }, writable: true });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Connect" }));
    await waitFor(() => expect(startGoogleAuthorization).toHaveBeenCalledWith("outlet_002"));
    expect(assign).toHaveBeenCalledWith("https://accounts.google.com/o/oauth2/v2/auth?state=abc");
  });

  it("disables Connect in the selector until a business is chosen", async () => {
    getGoogleConnection.mockResolvedValue({ ...disconnected, status: "pending_location" });
    listGoogleLocations.mockResolvedValue([
      {
        accountName: "accounts/1",
        accountLabel: "Owner",
        locationName: "locations/9",
        title: "Bali Wellness",
        address: "43-G, Cheras",
        mapsUri: null,
      },
      {
        accountName: "accounts/1",
        accountLabel: "Owner",
        locationName: "locations/10",
        title: "Sohokaki Reflexology",
        address: "Lot F14",
        mapsUri: null,
      },
    ]);
    renderPage();
    expect(await screen.findByText("Select the business to connect")).toBeTruthy();
    expect(screen.getByText("Bali Wellness")).toBeTruthy();
    const connect = screen.getByRole("button", { name: "Connect" });
    expect(connect).toBeDisabled();
    fireEvent.click(screen.getByText("Sohokaki Reflexology"));
    expect(connect).not.toBeDisabled();
  });

  it("shows connected business details after a location is saved", async () => {
    getGoogleConnection.mockResolvedValue(connected);
    renderPage();
    expect(await screen.findByText("Sohokaki Wellness Center")).toBeTruthy();
    expect(screen.getByText("4.8 ★")).toBeTruthy();
    expect(screen.getByText("194")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeTruthy();
  });
});
