import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const from = vi.fn();

vi.mock("@bookglow/supabase", () => ({
  createBrowserSupabaseClient: () => ({ rpc, from }),
}));

import { resolveOutletIdFromBookingPathSupabase } from "../../services/supabasePublicBooking";

function maybeSingleResult(data: unknown) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data, error: null }),
        limit: () => ({
          maybeSingle: () => Promise.resolve({ data, error: null }),
        }),
        ilike: () => ({
          limit: () => ({
            maybeSingle: () => Promise.resolve({ data, error: null }),
          }),
        }),
      }),
      ilike: () => ({
        limit: () => ({
          maybeSingle: () => Promise.resolve({ data, error: null }),
        }),
      }),
    }),
  };
}

describe("resolveOutletIdFromBookingPathSupabase", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
  });

  it("uses the public RPC when it returns an outlet", async () => {
    rpc.mockResolvedValue({ data: "outlet_abc", error: null });
    await expect(resolveOutletIdFromBookingPathSupabase("RestoranDesaPetaling")).resolves.toBe(
      "outlet_abc",
    );
    expect(rpc).toHaveBeenCalledWith("resolve_public_booking_outlet", {
      p_segment: "RestoranDesaPetaling",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("falls back to shop-name matching when the RPC is missing", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "missing" } });
    let call = 0;
    from.mockImplementation(() => {
      call += 1;
      if (call <= 3) return maybeSingleResult(null);
      return {
        select: () =>
          Promise.resolve({
            data: [
              {
                outlet_id: "outlet_one",
                booking_slug: "restoran-desa-petaling-12ab34",
                name: "Restoran Desa Petaling",
              },
            ],
            error: null,
          }),
      };
    });

    await expect(resolveOutletIdFromBookingPathSupabase("restoranDesaPetaling")).resolves.toBe(
      "outlet_one",
    );
  });
});
