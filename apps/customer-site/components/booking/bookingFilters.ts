import type { PublicService } from "../../services/bookingApi";

/** Filter public services by category chip and search query. */
export function filterPublicServices(
  services: PublicService[],
  selectedCategory: string | null,
  searchQuery: string
): PublicService[] {
  let list = services;
  if (selectedCategory && selectedCategory !== "All") {
    if (selectedCategory === "Promotion") {
      list = list.filter(
        (s) => s.isPromotion === true || (s.category || "").toLowerCase() === "promotion"
      );
    } else {
      list = list.filter(
        (s) => (s.category || "").toLowerCase() === selectedCategory.toLowerCase()
      );
    }
  }
  const q = (searchQuery || "").trim().toLowerCase();
  if (q) {
    list = list.filter((s) => (s.name || "").toLowerCase().includes(q));
  }
  return list;
}

export function sumSelectedServiceTotals(
  selections: Array<{ service: Pick<PublicService, "price" | "duration"> }>
): { totalPrice: number; totalDuration: number; count: number } {
  return {
    count: selections.length,
    totalPrice: selections.reduce((total, item) => total + Number(item.service.price || 0), 0),
    totalDuration: selections.reduce(
      (total, item) => total + Number(item.service.duration || 0),
      0
    ),
  };
}

/** Shorten address for the mobile dock without causing overflow. */
export function shortenAddress(address: string, max = 42): string {
  if (!address) return "";
  if (address.length <= max) return address;
  return `${address.slice(0, max - 1).trimEnd()}…`;
}
