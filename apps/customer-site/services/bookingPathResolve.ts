import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Map /book/:segment to the real Firestore outlet document id.
 * Supports legacy URLs that use the document id (e.g. outlet_001) and pretty paths via outlets.bookingSlug.
 */
export async function resolveOutletIdFromBookingPath(segment: string): Promise<string | null> {
  const s = (segment || "").trim();
  if (!s) return null;

  const directSnap = await getDoc(doc(db, "outlets", s));
  if (directSnap.exists()) return s;

  const q = query(collection(db, "outlets"), where("bookingSlug", "==", s), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;

  return null;
}
