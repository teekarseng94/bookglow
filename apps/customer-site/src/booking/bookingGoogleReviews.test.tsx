import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const invoke = vi.hoisted(() => vi.fn());

vi.mock("@bookglow/supabase", () => ({
  createBrowserSupabaseClient: () => ({ functions: { invoke } }),
}));

import { BookingGoogleReviews } from "../../components/booking/BookingGoogleReviews";
import { fetchGoogleReviews } from "../../services/googleReviewsApi";

const review = (overrides: Record<string, unknown> = {}) => ({
  id: "r1",
  authorName: "Nurul Aisyah",
  avatarUrl: "https://lh3.googleusercontent.com/a/photo",
  isAnonymous: false,
  rating: 5,
  comment: "Wonderful treatment, very professional staff.",
  createTime: "2026-09-01T00:00:00Z",
  updateTime: "2026-09-01T00:00:00Z",
  ...overrides,
});

const readyPage = (overrides: Record<string, unknown> = {}) => ({
  data: {
    enabled: true,
    source: "google",
    locationTitle: "Sohokaki Razak Residence",
    mapsUri: "https://maps.google.com/?cid=1",
    averageRating: 4.8,
    totalReviewCount: 194,
    reviews: [review()],
    nextCursor: null,
    supportedSorts: ["newest", "highest", "lowest"],
    ...overrides,
  },
  error: null,
});

beforeEach(() => {
  invoke.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("public Google reviews transport", () => {
  it("sends only the booking slug, sort and cursor", async () => {
    invoke.mockResolvedValue(readyPage());
    await fetchGoogleReviews({ bookingSlug: "sohokakiWellnessCenter", orderBy: "highest", cursor: "abc" });
    expect(invoke).toHaveBeenCalledWith("google-business", {
      body: {
        action: "public_reviews",
        bookingSlug: "sohokakiWellnessCenter",
        orderBy: "highest",
        cursor: "abc",
      },
    });
  });

  it("reports a disabled integration rather than an empty review list", async () => {
    invoke.mockResolvedValue({ data: { enabled: false, reason: "disabled" }, error: null });
    await expect(fetchGoogleReviews({ bookingSlug: "spa" })).resolves.toEqual({ state: "disabled" });
  });

  it("distinguishes a Google failure from zero reviews", async () => {
    invoke.mockResolvedValue({
      data: { enabled: true, source: "unavailable", unavailable: true, locationTitle: "Spa", mapsUri: null },
      error: null,
    });
    const result = await fetchGoogleReviews({ bookingSlug: "spa" });
    expect(result.state).toBe("unavailable");
  });

  it("drops sort orders the server does not support", async () => {
    invoke.mockResolvedValue(readyPage({ supportedSorts: ["newest", "relevance"] }));
    const result = await fetchGoogleReviews({ bookingSlug: "spa" });
    if (result.state !== "ready") throw new Error("expected a ready page");
    expect(result.supportedSorts).toEqual(["newest"]);
  });

  it("surfaces a server error message", async () => {
    invoke.mockResolvedValue({ data: { error: "This page of reviews expired." }, error: { message: "410" } });
    await expect(fetchGoogleReviews({ bookingSlug: "spa" })).rejects.toThrow("This page of reviews expired.");
  });
});

describe("BookingGoogleReviews", () => {
  it("shows Google's aggregate rating and total, not values from the loaded cards", async () => {
    invoke.mockResolvedValue(readyPage());
    render(<BookingGoogleReviews bookingSlug="spa" />);
    expect(await screen.findByText("4.8")).toBeTruthy();
    expect(screen.getByText("194 Google reviews")).toBeTruthy();
    expect(screen.getByText("Google reviews")).toBeTruthy();
  });

  it("includes Google attribution and a source link, and no write-a-review action", async () => {
    invoke.mockResolvedValue(readyPage());
    render(<BookingGoogleReviews bookingSlug="spa" />);
    expect(await screen.findByText("Reviews from Google")).toBeTruthy();
    expect(screen.getByText("View on Google Maps").getAttribute("href")).toBe("https://maps.google.com/?cid=1");
    expect(screen.getByText("From Google")).toBeTruthy();
    expect(screen.queryByText(/write a review/i)).toBeNull();
  });

  it("omits a rating distribution because Google does not supply one", async () => {
    invoke.mockResolvedValue(readyPage());
    render(<BookingGoogleReviews bookingSlug="spa" />);
    await screen.findByText("4.8");
    expect(screen.queryByText(/^5★$/)).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("renders a rating-only review without inventing text", async () => {
    invoke.mockResolvedValue(readyPage({ reviews: [review({ comment: null })] }));
    render(<BookingGoogleReviews bookingSlug="spa" />);
    expect(await screen.findByText(/did not leave a comment/i)).toBeTruthy();
  });

  it("falls back to initials when an avatar is missing", async () => {
    invoke.mockResolvedValue(readyPage({ reviews: [review({ avatarUrl: null, authorName: "Kenji Tan" })] }));
    render(<BookingGoogleReviews bookingSlug="spa" />);
    expect(await screen.findByText("KT")).toBeTruthy();
  });

  it("truncates a long comment behind Read more", async () => {
    const long = `${"Wonderful treatment and a very calm room. ".repeat(12)}Thank you.`;
    invoke.mockResolvedValue(readyPage({ reviews: [review({ comment: long })] }));
    render(<BookingGoogleReviews bookingSlug="spa" />);
    const toggle = await screen.findByText("Read more");
    expect(screen.queryByText(long)).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByText(long)).toBeTruthy();
  });

  it("labels a translated review and can show the original wording", async () => {
    invoke.mockResolvedValue(
      readyPage({
        reviews: [review({ comment: "(Translated by Google) Very good massage\n\n(Original)\nUrut sangat bagus" })],
      }),
    );
    render(<BookingGoogleReviews bookingSlug="spa" />);
    expect(await screen.findByText("Very good massage")).toBeTruthy();
    fireEvent.click(screen.getByText("Show original"));
    expect(screen.getByText("Urut sangat bagus")).toBeTruthy();
  });

  it("loads another page without duplicating repeated entries", async () => {
    invoke
      .mockResolvedValueOnce(readyPage({ reviews: [review({ id: "a" }), review({ id: "b" })], nextCursor: "c1" }))
      .mockResolvedValueOnce(readyPage({ reviews: [review({ id: "b" }), review({ id: "c" })], nextCursor: null }));

    render(<BookingGoogleReviews bookingSlug="spa" />);
    fireEvent.click(await screen.findByText("Load more reviews"));

    await waitFor(() => expect(screen.queryByText("Load more reviews")).toBeNull());
    expect(invoke.mock.calls[1][1].body.cursor).toBe("c1");
    expect(screen.getAllByText("Nurul Aisyah")).toHaveLength(3);
  });

  it("restarts pagination from the server when the sort order changes", async () => {
    invoke.mockResolvedValue(readyPage({ nextCursor: "c1" }));
    render(<BookingGoogleReviews bookingSlug="spa" />);
    await screen.findByText("4.8");

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "lowest" } });
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    expect(invoke.mock.calls[1][1].body).toMatchObject({ orderBy: "lowest", cursor: null });
  });

  it("renders the supplied fallback when the integration is disabled", async () => {
    invoke.mockResolvedValue({ data: { enabled: false, reason: "disabled" }, error: null });
    render(<BookingGoogleReviews bookingSlug="spa" fallback={<p>BookGlow reviews</p>} />);
    expect(await screen.findByText("BookGlow reviews")).toBeTruthy();
    expect(screen.queryByText("Google reviews")).toBeNull();
  });

  it("shows a concise unavailable state instead of a false zero count", async () => {
    invoke.mockResolvedValue({
      data: {
        enabled: true,
        source: "unavailable",
        unavailable: true,
        locationTitle: "Spa",
        mapsUri: "https://maps.google.com/?cid=1",
      },
      error: null,
    });
    render(<BookingGoogleReviews bookingSlug="spa" />);
    expect(await screen.findByText(/temporarily unavailable/i)).toBeTruthy();
    expect(screen.queryByText(/0 Google reviews/)).toBeNull();
  });

  it("keeps the booking page usable when the reviews request throws", async () => {
    invoke.mockRejectedValue(new Error("network down"));
    render(<BookingGoogleReviews bookingSlug="spa" fallback={<p>BookGlow reviews</p>} />);
    expect(await screen.findByText("BookGlow reviews")).toBeTruthy();
  });
});
