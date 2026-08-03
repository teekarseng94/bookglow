import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  filterPublicServices,
  shortenAddress,
  sumSelectedServiceTotals,
} from "../../components/booking/bookingFilters";
import { BookingServiceCard } from "../../components/booking/BookingServiceCard";
import { BookingStickyAction } from "../../components/booking/BookingStickyAction";
import { BookingSectionTabs } from "../../components/booking/BookingSectionTabs";
import { BookingMerchantHeader } from "../../components/booking/BookingMerchantHeader";
import type { PublicService } from "../../services/bookingApi";

const services: PublicService[] = [
  {
    id: "s1",
    name: "Foot Massage",
    price: 58,
    duration: 60,
    category: "Foot Massage",
  },
  {
    id: "s2",
    name: "Full Body Massage 60mins",
    price: 78,
    duration: 60,
    category: "Full Body Massage",
  },
  {
    id: "s3",
    name: "Happy Hour Facial",
    price: 45,
    duration: 45,
    category: "Facial",
    isPromotion: true,
  },
  {
    id: "s4",
    name: "Extra Long Category Name Service",
    price: 99,
    duration: 90,
    category: "Very Long Category Name That Should Truncate Safely",
  },
];

describe("public booking filters", () => {
  it("keeps All category unfiltered", () => {
    expect(filterPublicServices(services, null, "")).toHaveLength(4);
  });

  it("filters by category", () => {
    const result = filterPublicServices(services, "Facial", "");
    expect(result.map((s) => s.id)).toEqual(["s3"]);
  });

  it("filters Promotion including isPromotion flag", () => {
    const result = filterPublicServices(services, "Promotion", "");
    expect(result.map((s) => s.id)).toEqual(["s3"]);
  });

  it("filters by search query on service name", () => {
    const result = filterPublicServices(services, null, "body");
    expect(result.map((s) => s.id)).toEqual(["s2"]);
  });

  it("combines category and search filters", () => {
    const result = filterPublicServices(services, "Full Body Massage", "massage");
    expect(result.map((s) => s.id)).toEqual(["s2"]);
  });

  it("supports long category names without dropping the service", () => {
    const result = filterPublicServices(
      services,
      "Very Long Category Name That Should Truncate Safely",
      ""
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s4");
  });
});

describe("selected service totals", () => {
  it("counts duplicate selections and totals price/duration", () => {
    const selections = [
      { service: services[0] },
      { service: services[0] },
      { service: services[1] },
    ];
    expect(sumSelectedServiceTotals(selections)).toEqual({
      count: 3,
      totalPrice: 58 + 58 + 78,
      totalDuration: 60 + 60 + 60,
    });
  });
});

describe("shortenAddress", () => {
  it("leaves short addresses intact", () => {
    expect(shortenAddress("SOHOKAKI, D-1-30 Razak Residence")).toBe(
      "SOHOKAKI, D-1-30 Razak Residence"
    );
  });

  it("truncates long addresses for the dock", () => {
    const long =
      "SOHOKAKI WELLNESS CENTER, D-1-30 Razak Residence, Jalan Peel, Kuala Lumpur 55100";
    const short = shortenAddress(long, 42);
    expect(short.endsWith("…")).toBe(true);
    expect(short.length).toBeLessThanOrEqual(42);
  });
});

describe("BookingServiceCard", () => {
  it("keeps the whole row keyboard operable and shows selected count", () => {
    const onSelect = vi.fn();
    render(
      <BookingServiceCard
        name="Full Body Massage 60mins"
        durationMinutes={60}
        category="Full Body Massage"
        priceLabel="RM 78"
        selectedCount={2}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText("RM 78")).toBeTruthy();
    expect(screen.getByText(/60 min/)).toBeTruthy();
    expect(screen.getAllByText(/x2/).length).toBeGreaterThan(0);

    const row = screen.getByRole("button", { name: /Full Body Massage 60mins/i });
    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("handles long service names without dropping the price", () => {
    render(
      <BookingServiceCard
        name="Extra Long Deluxe Signature Full Body Massage Experience"
        durationMinutes={90}
        category="Massage"
        priceLabel="RM 128"
        onSelect={() => undefined}
      />
    );
    expect(screen.getByText("RM 128")).toBeTruthy();
    expect(
      screen.getByText("Extra Long Deluxe Signature Full Body Massage Experience")
    ).toBeTruthy();
  });
});

describe("BookingStickyAction dock", () => {
  it("disables Continue with zero services and enables after selection", () => {
    const onAction = vi.fn();
    const { rerender } = render(
      <BookingStickyAction
        merchantName="SOHOKAKI WELLNESS CENTER"
        isOpen
        address="SOHOKAKI, D-1-30 Razak Residence"
        selectedCount={0}
        totalPriceLabel="RM 0.00"
        onAction={onAction}
        disabled
        secondaryLabel="Choose staff later"
        onSecondary={() => undefined}
      />
    );

    expect(
      (screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled
    ).toBe(true);
    expect(screen.getByText(/Open now/i)).toBeTruthy();

    rerender(
      <BookingStickyAction
        merchantName="SOHOKAKI WELLNESS CENTER"
        isOpen
        address="SOHOKAKI, D-1-30 Razak Residence"
        selectedCount={2}
        totalPriceLabel="RM 136.00"
        totalDurationMinutes={120}
        onAction={onAction}
        disabled={false}
        secondaryLabel="Choose staff later"
        onSecondary={() => undefined}
      />
    );

    const continueBtn = screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
    expect(continueBtn.disabled).toBe(false);
    expect(screen.getByText(/2 services selected/i)).toBeTruthy();
    expect(screen.getByText(/RM 136.00/)).toBeTruthy();
    fireEvent.click(continueBtn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("uses safe-area aware dock class", () => {
    const { container } = render(
      <BookingStickyAction
        merchantName="Test"
        selectedCount={0}
        totalPriceLabel="RM 0.00"
        onAction={() => undefined}
        disabled
      />
    );
    expect(container.querySelector(".booking-mobile-dock")).toBeTruthy();
    expect(container.querySelector(".booking-mobile-dock__handle")).toBeTruthy();
  });
});

describe("BookingSectionTabs", () => {
  it("renders all four section tabs without requiring horizontal scroll markup", () => {
    document.body.innerHTML = `
      <section id="services"></section>
      <section id="team"></section>
      <section id="reviews"></section>
      <section id="address"></section>
    `;

    const { container } = render(<BookingSectionTabs />);
    expect(screen.getByRole("tab", { name: "Services" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Team" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Reviews" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Address" })).toBeTruthy();
    expect(container.querySelector(".booking-section-tabs__inner")).toBeTruthy();
  });
});

describe("BookingMerchantHeader", () => {
  it("exposes back, share and login controls with accessible labels", () => {
    const onBack = vi.fn();
    const onShare = vi.fn();
    const onLogin = vi.fn();
    render(
      <BookingMerchantHeader
        merchantName="SOHOKAKI WELLNESS CENTER"
        onBack={onBack}
        onShare={onShare}
        onLogin={onLogin}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    fireEvent.click(screen.getByRole("button", { name: "Share this page" }));
    fireEvent.click(screen.getByRole("button", { name: "Customer login" }));
    expect(onBack).toHaveBeenCalled();
    expect(onShare).toHaveBeenCalled();
    expect(onLogin).toHaveBeenCalled();
    expect(screen.queryByText(/@/)).toBeNull();
  });
});

describe("category wrapping layout contract", () => {
  it("uses wrapping filter-row class instead of horizontal scroll helpers", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const text = readFileSync(
      resolve(__dirname, "../styles/utilities.css"),
      "utf8"
    );
    const blockMatch = text.match(/\.booking-filter-row\s*\{[^}]+\}/);
    expect(blockMatch).toBeTruthy();
    const block = blockMatch![0];
    expect(block).toContain("flex-wrap: wrap");
    expect(block).toContain("overflow: visible");
    expect(block).not.toContain("overflow-x: auto");
  });
});
