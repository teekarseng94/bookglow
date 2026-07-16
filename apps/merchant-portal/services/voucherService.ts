import {
  addDoc,
  collection,
  doc,
  deleteField,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Voucher } from '../types';

const VOUCHERS_COLLECTION = 'vouchers';

const cleanSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);

const randomToken = (length: number) => Math.random().toString(36).slice(2, 2 + length);
const randomDigits = (length: number) =>
  Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');

const asIso = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate().toISOString();
  }
  return undefined;
};

const mapDocToVoucher = (id: string, data: any): Voucher => ({
  id,
  outletID: data.outletID,
  name: data.name,
  price: Number(data.price || 0),
  serviceIds: Array.isArray(data.serviceIds) ? data.serviceIds : [],
  expiryDate: data.expiryDate,
  status: data.status || 'active',
  slug: data.slug,
  redemptionId: data.redemptionId,
  secretCode: data.secretCode,
  purchasedAt: asIso(data.purchasedAt),
  redeemedAt: asIso(data.redeemedAt),
  createdAt: asIso(data.createdAt),
});

const generateUniqueSlug = async (name: string): Promise<string> => {
  const base = cleanSlug(name) || `voucher-${randomToken(6)}`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${randomToken(4)}`;
    const q = query(collection(db, VOUCHERS_COLLECTION), where('slug', '==', candidate), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
};

export const voucherService = {
  async create(input: Omit<Voucher, 'id' | 'slug' | 'status' | 'createdAt'>): Promise<string> {
    const slug = await generateUniqueSlug(input.name);
    const docRef = await addDoc(collection(db, VOUCHERS_COLLECTION), {
      outletID: input.outletID,
      name: input.name,
      price: Number(input.price),
      serviceIds: input.serviceIds,
      expiryDate: input.expiryDate,
      slug,
      status: 'active',
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getByOutlet(outletID: string): Promise<Voucher[]> {
    const q = query(collection(db, VOUCHERS_COLLECTION), where('outletID', '==', outletID));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapDocToVoucher(d.id, d.data()));
  },

  async getBySlug(slug: string): Promise<Voucher | null> {
    const q = query(collection(db, VOUCHERS_COLLECTION), where('slug', '==', slug), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return mapDocToVoucher(d.id, d.data());
  },

  async getByRedemptionId(redemptionId: string): Promise<Voucher | null> {
    const q = query(collection(db, VOUCHERS_COLLECTION), where('redemptionId', '==', redemptionId), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return mapDocToVoucher(d.id, d.data());
  },

  async purchase(voucherId: string): Promise<{ redemptionId: string; secretCode: string }> {
    const voucherRef = doc(db, VOUCHERS_COLLECTION, voucherId);
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(voucherRef);
      if (!snap.exists()) throw new Error('Voucher not found.');
      const data = snap.data();
      if (data.status !== 'active') throw new Error('Voucher is no longer available.');
      if (data.expiryDate) {
        const endOfExpiry = new Date(`${String(data.expiryDate)}T23:59:59`);
        if (!Number.isNaN(endOfExpiry.getTime()) && Date.now() > endOfExpiry.getTime()) {
          throw new Error('Voucher has expired and can no longer be purchased.');
        }
      }
      if (data.secretCode && data.redemptionId) {
        return { redemptionId: data.redemptionId, secretCode: data.secretCode };
      }
      const redemptionId = `rv-${randomToken(8)}${Date.now().toString(36).slice(-4)}`;
      const secretCode = randomDigits(6);
      tx.update(voucherRef, {
        redemptionId,
        secretCode,
      });
      return { redemptionId, secretCode };
    });
  },

  async confirmSoldByCode(voucherId: string, inputCode: string): Promise<void> {
    const voucherRef = doc(db, VOUCHERS_COLLECTION, voucherId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(voucherRef);
      if (!snap.exists()) throw new Error('Voucher not found.');
      const data = snap.data();
      if (data.status !== 'active') throw new Error('Voucher is already sold or redeemed.');
      const expectedCode = String(data.secretCode || '');
      if (!expectedCode) throw new Error('No generated secret code found for this voucher.');
      if (expectedCode !== String(inputCode || '').trim()) throw new Error('Secret code is invalid.');
      tx.update(voucherRef, {
        status: 'sold',
        purchasedAt: serverTimestamp(),
      });
    });
  },

  async confirmRedemption(voucherId: string): Promise<void> {
    const voucherRef = doc(db, VOUCHERS_COLLECTION, voucherId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(voucherRef);
      if (!snap.exists()) throw new Error('Voucher not found.');
      const data = snap.data();
      if (data.status === 'redeemed') return;
      if (data.status !== 'sold') throw new Error('Voucher must be purchased before redemption.');
      tx.update(voucherRef, {
        status: 'redeemed',
        redeemedAt: serverTimestamp(),
      });
    });
  },

  async updateStatus(id: string, status: Voucher['status']): Promise<void> {
    await updateDoc(doc(db, VOUCHERS_COLLECTION, id), { status });
  },

  async resetVoucher(voucherId: string): Promise<void> {
    await updateDoc(doc(db, VOUCHERS_COLLECTION, voucherId), {
      status: 'active',
      redemptionId: deleteField(),
      secretCode: deleteField(),
      purchasedAt: deleteField(),
      redeemedAt: deleteField(),
    });
  },

  async getById(id: string): Promise<Voucher | null> {
    const snap = await getDoc(doc(db, VOUCHERS_COLLECTION, id));
    if (!snap.exists()) return null;
    return mapDocToVoucher(snap.id, snap.data());
  },
};
