import { describe, expect, it } from "vitest";
import { formatLocalDate, localMonthBounds, resolveDisplayedClientCount } from "./localCalendar";

describe("local calendar bounds", () => {
  it("keeps 1 Oct and 31 Oct on the local calendar", () => {
    expect(formatLocalDate(new Date(2026, 9, 1, 0, 30, 0))).toBe("2026-10-01");
    expect(localMonthBounds(new Date(2026, 9, 10, 12, 0, 0))).toEqual({
      start: "2026-10-01",
      end: "2026-10-31",
    });
  });

  it("uses the exact member count when the loaded page is only the first 50", () => {
    expect(resolveDisplayedClientCount({ rpcCount: null, exactCount: 780, loadedPageLength: 50 })).toBe(780);
    expect(resolveDisplayedClientCount({ rpcCount: 780, exactCount: null, loadedPageLength: 50 })).toBe(780);
  });
});
