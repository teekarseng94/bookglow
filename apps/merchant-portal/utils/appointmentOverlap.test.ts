import { describe, expect, it } from "vitest";
import { formatMinutes, staffBookingConflicts } from "./appointmentOverlap";

describe("staff booking overlap", () => {
  const existing = [
    { id: "a", staffId: "staff-1", date: "2026-10-10", time: "10:00", endTime: "11:00", status: "scheduled" },
  ];

  it("rejects a second booking inside an existing staff window", () => {
    expect(
      staffBookingConflicts(
        { staffId: "staff-1", date: "2026-10-10", time: "10:30", endTime: "11:30" },
        existing,
      ),
    ).toBe(true);
  });

  it("allows the next slot that starts when the previous one ends", () => {
    expect(
      staffBookingConflicts(
        { staffId: "staff-1", date: "2026-10-10", time: "11:00", endTime: "12:00" },
        existing,
      ),
    ).toBe(false);
  });

  it("ignores cancelled appointments and other staff", () => {
    expect(
      staffBookingConflicts(
        { staffId: "staff-1", date: "2026-10-10", time: "10:00", endTime: "11:00" },
        [{ ...existing[0], status: "cancelled" }],
      ),
    ).toBe(false);
    expect(
      staffBookingConflicts(
        { staffId: "staff-2", date: "2026-10-10", time: "10:00", endTime: "11:00" },
        existing,
      ),
    ).toBe(false);
  });

  it("uses service duration when the stored end time is missing", () => {
    expect(
      staffBookingConflicts(
        { staffId: "staff-1", date: "2026-10-10", time: "10:30", durationMinutes: 60 },
        [{ id: "b", staffId: "staff-1", date: "2026-10-10", time: "10:00", status: "scheduled", durationMinutes: 90 }],
      ),
    ).toBe(true);
    expect(formatMinutes(90)).toBe("01:30");
  });
});
