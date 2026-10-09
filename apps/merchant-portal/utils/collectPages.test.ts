import { describe, expect, it } from "vitest";
import { collectPages } from "./collectPages";

describe("collectPages", () => {
  it("loads every page instead of stopping at 500", async () => {
    const source = Array.from({ length: 620 }, (_, index) => index);
    const seen: number[] = [];
    const rows = await collectPages(async (offset, limit) => {
      seen.push(offset);
      return source.slice(offset, offset + limit);
    }, 500);
    expect(rows).toHaveLength(620);
    expect(seen).toEqual([0, 500]);
  });

  it("fails closed when the cap is hit", async () => {
    await expect(collectPages(async () => [1, 2], 2, 4)).rejects.toThrow(/not fully loaded/);
  });
});
