import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const getGoogleConnection = vi.hoisted(() => vi.fn());
const searchGooglePlaces = vi.hoisted(() => vi.fn());
const connectGooglePlace = vi.hoisted(() => vi.fn());
const startGoogleAuthorization = vi.hoisted(() => vi.fn());
const listGoogleLocations = vi.hoisted(() => vi.fn());
const selectGoogleLocation = vi.hoisted(() => vi.fn());
const disconnectGoogleReviews = vi.hoisted(() => vi.fn());
const refreshGoogleReviews = vi.hoisted(() => vi.fn());
const setGoogleReviewsVisibility = vi.hoisted(() => vi.fn());

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
  searchGooglePlaces,
  connectGooglePlace,
  startGoogleAuthorization,
  listGoogleLocations,
  selectGoogleLocation,
  disconnectGoogleReviews,
  refreshGoogleReviews,
  setGoogleReviewsVisibility,
}));

vi.mock("../services/databaseService", () => ({
  outletService: {
    getById: vi.fn().mockResolvedValue({ addressDisplay: "Lot F14, Kuala Lumpur", address: "Lot F14" }),
  },
}));

const openExternalUrl = vi.hoisted(() => vi.fn());
vi.mock("../src/native/androidShell", () => ({ openExternalUrl }));

import GoogleReviewsIntegrationPage from "./GoogleReviewsIntegrationPage";

const disconnected = {
  configured: true,
  missingConfig: [],
  status: "disconnected",
  provider: null,
  defaultProvider: "google_places",
  showOnBookingPage: false,
};

const connected = {
  ...disconnected,
  status: "connected",
  provider: "google_places",
  placeId: "ChIJPlacesTest",
  locationTitle: "Sohokaki Wellness Center",
  locationAddress: "Lot F14, Kuala Lumpur",
  mapsUri: "https://maps.google.com/?cid=1",
  averageRating: 4.8,
  totalReviewCount: 194,
  lastSyncedAt: "2026-09-12T08:00:00.000Z",
  showOnBookingPage: true,
};

beforeEach(() => {
  getGoogleConnection.mockReset();
  searchGooglePlaces.mockReset();
  connectGooglePlace.mockReset();
  startGoogleAuthorization.mockReset();
  listGoogleLocations.mockReset();
  selectGoogleLocation.mockReset();
  disconnectGoogleReviews.mockReset();
  refreshGoogleReviews.mockReset();
  setGoogleReviewsVisibility.mockReset();
  localStorage.clear();
  getGoogleConnection.mockResolvedValue(disconnected);
  searchGooglePlaces.mockResolvedValue([
    {
      placeId: "ChIJBali",
      title: "Bali Wellness",
      address: "Kuala Lumpur, Malaysia",
      rating: 4.9,
      userRatingCount: 194,
      mapsUri: "https://maps.google.com/?cid=bali",
    },
  ]);
  connectGooglePlace.mockResolvedValue(connected);
  openExternalUrl.mockReset();
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
    expect(await screen.findByRole("button", { name: "Connect Google Reviews" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Instructions" }));
    expect(screen.getByText(/Click Connect Google Reviews/i)).toBeTruthy();
  });

  it("opens the Places search dialog from Connect without starting OAuth", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Connect Google Reviews" }));
    expect(await screen.findByText("Find Your Business on Google")).toBeTruthy();
    expect(startGoogleAuthorization).not.toHaveBeenCalled();
    expect(openExternalUrl).not.toHaveBeenCalled();
  });

  it("prefills search from the outlet name and address, then connects a selected place", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Connect Google Reviews" }));
    const input = await screen.findByLabelText(/Business name or address/i);
    await waitFor(() => expect((input as HTMLInputElement).value).toMatch(/Sohokaki/));
    await waitFor(() => expect(searchGooglePlaces).toHaveBeenCalled());
    expect(await screen.findByText("Bali Wellness")).toBeTruthy();
    fireEvent.click(screen.getByText("Bali Wellness"));
    fireEvent.click(screen.getByRole("button", { name: "Connect this business" }));
    await waitFor(() =>
      expect(connectGooglePlace).toHaveBeenCalledWith("outlet_002", "ChIJBali"),
    );
    expect(await screen.findByText("Sohokaki Wellness Center")).toBeTruthy();
  });

  it("rejects empty searches by not calling Places when the query is blank", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Connect Google Reviews" }));
    const input = await screen.findByLabelText(/Business name or address/i);
    fireEvent.change(input, { target: { value: " " } });
    await waitFor(() => expect((input as HTMLInputElement).value).toBe(" "));
    searchGooglePlaces.mockClear();
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(searchGooglePlaces).not.toHaveBeenCalled();
  });

  it("shows a setup-required message instead of an unresponsive Connect button", async () => {
    getGoogleConnection.mockResolvedValue({
      configured: false,
      missingConfig: ["GOOGLE_PLACES_API_KEY"],
      status: "setup_required",
      showOnBookingPage: false,
    });
    renderPage();
    expect(await screen.findByText(/GOOGLE_PLACES_API_KEY/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Connect Google Reviews" })).toBeNull();
  });

  it("uses Places Connect instead of GBP location picker when Places is the default", async () => {
    getGoogleConnection.mockResolvedValue({
      ...disconnected,
      status: "pending_location",
      provider: "google_business_profile",
      defaultProvider: "google_places",
    });
    renderPage();
    expect(await screen.findByRole("button", { name: "Connect Google Reviews" })).toBeTruthy();
    expect(listGoogleLocations).not.toHaveBeenCalled();
    expect(screen.queryByText("Select the business to connect")).toBeNull();
  });

  it("keeps the Business Profile location selector when Places is not the default", async () => {
    getGoogleConnection.mockResolvedValue({
      ...disconnected,
      status: "pending_location",
      provider: "google_business_profile",
      defaultProvider: "google_business_profile",
    });
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

  it("keeps the saved connection when the status check fails after login", async () => {
    localStorage.setItem(
      "bookglow.googleReviews.connection.outlet_002",
      JSON.stringify(connected),
    );
    getGoogleConnection.mockRejectedValue(new Error("Authentication required."));
    renderPage();
    expect(await screen.findByText("Sohokaki Wellness Center")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Connect Google Reviews" })).toBeNull();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeTruthy();
  });

  it("shows connected business details, sync, change, and disconnect controls", async () => {
    getGoogleConnection.mockResolvedValue(connected);
    renderPage();
    expect(await screen.findByText("Sohokaki Wellness Center")).toBeTruthy();
    expect(screen.getByText("4.8 ★")).toBeTruthy();
    expect(screen.getByText("194")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sync Now" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Change Business" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeTruthy();
    expect(screen.getByLabelText(/Show Google Reviews on Booking Page/i)).toBeTruthy();
  });

  it("refreshes Places data from Sync Now", async () => {
    getGoogleConnection.mockResolvedValue(connected);
    refreshGoogleReviews.mockResolvedValue({ ...connected, averageRating: 4.9 });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Sync Now" }));
    await waitFor(() => expect(refreshGoogleReviews).toHaveBeenCalledWith("outlet_002"));
  });

  it("disconnects the outlet connection", async () => {
    getGoogleConnection.mockResolvedValue(connected);
    disconnectGoogleReviews.mockResolvedValue(disconnected);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Disconnect" }));
    expect(await screen.findByText("Disconnect Google Reviews?")).toBeTruthy();
    const disconnectButtons = screen.getAllByRole("button", { name: "Disconnect" });
    fireEvent.click(disconnectButtons[disconnectButtons.length - 1]);
    await waitFor(() => expect(disconnectGoogleReviews).toHaveBeenCalledWith("outlet_002"));
  });
});
