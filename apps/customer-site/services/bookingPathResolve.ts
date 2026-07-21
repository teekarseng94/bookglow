import { collection, doc, getDoc, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "./firebase";
import { shopNameToBookingSlug } from "../utils/bookingSlug";

function normalizeSegment(segment: string): string {
  return (segment || "").trim();
}

/**
 * Map /book/:segment to the real Firestore outlet document id.
 *
 * Resolution order:
 * 1. Document id (legacy `/book/outlet_001`)
 * 2. Exact `outlets.bookingSlug`
 * 3. Case-insensitive `bookingSlug` match
 * 4. Slug derived from outlet `name` (Settings often displays this before it is saved)
 */
export async function resolveOutletIdFromBookingPath(segment: string): Promise<string | null> {
  const s = normalizeSegment(segment);
  if (!s) return null;

  const directSnap = await getDoc(doc(db, "outlets", s));
  if (directSnap.exists()) return s;

  const exact = query(collection(db, "outlets"), where("bookingSlug", "==", s), limit(1));
  const exactSnap = await getDocs(exact);
  if (!exactSnap.empty) return exactSnap.docs[0].id;

  const lower = s.toLowerCase();
  const allSnap = await getDocs(collection(db, "outlets"));
  for (const d of allSnap.docs) {
    const data = d.data() as { bookingSlug?: string; name?: string };
    const stored = (data.bookingSlug || "").trim();
    if (stored && stored.toLowerCase() === lower) return d.id;

    const derived = shopNameToBookingSlug(data.name || "");
    if (derived && derived.toLowerCase() === lower) return d.id;
  }

  return null;
}
