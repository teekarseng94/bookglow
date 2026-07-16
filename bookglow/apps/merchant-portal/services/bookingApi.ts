/**
 * Public booking API (no auth). Calls Cloud Functions for outlet data and creating bookings.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

const functions = getFunctions(app, 'asia-southeast1');

export interface PublicOutlet {
  id: string;
  name: string;
}

export interface PublicService {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: string;
}

export interface PublicOutletData {
  outlet: PublicOutlet;
  services: PublicService[];
}

export interface CreateBookingPayload {
  outletId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  customerName: string;
  phone: string;
  email?: string;
}

export interface CreateBookingResult {
  success: boolean;
  appointmentId: string;
}

export async function getPublicOutletData(outletId: string): Promise<PublicOutletData> {
  const fn = httpsCallable<{ outletId: string }, PublicOutletData>(functions, 'getPublicOutletData');
  const res = await fn({ outletId });
  return res.data;
}

export async function createPublicBooking(payload: CreateBookingPayload): Promise<CreateBookingResult> {
  const fn = httpsCallable<CreateBookingPayload, CreateBookingResult>(functions, 'createPublicBooking');
  const res = await fn(payload);
  return res.data;
}
