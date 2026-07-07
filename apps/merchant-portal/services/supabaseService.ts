/**
 * Supabase Service Layer
 * Mirrors firestoreService API for drop-in replacement.
 */
import { supabase } from '../lib/supabase';
import type { Client, Staff, Appointment, Transaction, Service, Product, Package, Reward, Outlet, ApiIntegration, TransactionType } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

let currentOutletID = '';
export const setCurrentOutletID = (id: string) => { currentOutletID = id || ''; };
export const getCurrentOutletID = () => currentOutletID;

function valid(id: string | undefined): boolean {
  return id != null && String(id).trim().length > 0;
}

// ── CLIENT SERVICE ──
export const clientService = {
  getAll: async (outletID = currentOutletID): Promise<Client[]> => {
    if (!valid(outletID)) return [];
    const { data } = await supabase.from('clients').select('*').eq('outlet_id', outletID).order('created_at', { ascending: false });
    return (data || []).map(r => ({ ...r, id: r.id, outletID: r.outlet_id, createdAt: r.created_at, voucherCount: r.voucher_count, memberTier: r.member_tier, lastImportId: r.last_import_id } as unknown as Client));
  },
  getById: async (clientId: string, outletID = currentOutletID): Promise<Client | null> => {
    if (!valid(outletID)) return null;
    const { data } = await supabase.from('clients').select('*').eq('id', clientId).eq('outlet_id', outletID).single();
    return data ? ({ ...data, outletID: data.outlet_id, createdAt: data.created_at, voucherCount: data.voucher_count } as unknown as Client) : null;
  },
  add: async (client: any, outletID = currentOutletID): Promise<string> => {
    if (!valid(outletID)) throw new Error('outletID required');
    const id = crypto.randomUUID();
    const { error } = await supabase.from('clients').insert({ id, outlet_id: outletID, name: client.name || '', email: client.email || '', phone: client.phone || '', notes: client.notes || '', points: client.points ?? 0, credit: 0, voucher_count: 0, outstanding: 0, birthday: client.birthday, gender: client.gender, source: client.source, ic: client.ic, marital: client.marital, tag: client.tag, ethnic: client.ethnic, member_tier: client.memberTier, last_import_id: client.lastImportId });
    if (error) throw new Error(error.message);
    return id;
  },
  update: async (clientId: string, updates: any, outletID = currentOutletID): Promise<void> => {
    if (!valid(outletID)) throw new Error('outletID required');
    const mapped: any = {};
    for (const [k, v] of Object.entries(updates)) {
      if (k === 'outletID') mapped.outlet_id = v;
      else if (k === 'createdAt') mapped.created_at = v;
      else if (k === 'voucherCount') mapped.voucher_count = v;
      else if (k === 'memberTier') mapped.member_tier = v;
      else if (k === 'lastImportId') mapped.last_import_id = v;
      else mapped[k] = v;
    }
    const { error } = await supabase.from('clients').update(mapped).eq('id', clientId).eq('outlet_id', outletID);
    if (error) throw new Error(error.message);
  },
  updatePoints: async (clientId: string, pointsChange: number, outletID = currentOutletID): Promise<void> => {
    const { data } = await supabase.from('clients').select('points').eq('id', clientId).eq('outlet_id', outletID).single();
    if (!data) throw new Error('Client not found');
    await supabase.from('clients').update({ points: (data.points || 0) + pointsChange }).eq('id', clientId);
  },
  updatePointsForSale: async (clientId: string, pointsToAdd: number, saleId: string, outletID = currentOutletID): Promise<void> => {
    if (pointsToAdd <= 0) return;
    const { data: existing } = await supabase.from('points_credits').select('sale_id').eq('client_id', clientId).eq('sale_id', saleId).single();
    if (existing) return;
    const { data: client } = await supabase.from('clients').select('points').eq('id', clientId).eq('outlet_id', outletID).single();
    if (!client) throw new Error('Client not found');
    await supabase.from('clients').update({ points: (client.points || 0) + pointsToAdd }).eq('id', clientId);
    await supabase.from('points_credits').insert({ client_id: clientId, sale_id: saleId, points: pointsToAdd });
  },
  incrementVoucherCount: async (clientId: string, delta: number, outletID = currentOutletID): Promise<void> => {
    if (delta <= 0) return;
    const { data } = await supabase.from('clients').select('voucher_count').eq('id', clientId).eq('outlet_id', outletID).single();
    if (!data) throw new Error('Client not found');
    await supabase.from('clients').update({ voucher_count: (data.voucher_count || 0) + delta }).eq('id', clientId);
  },
  redeemVoucher: async (clientId: string, outletID = currentOutletID): Promise<void> => {
    const { data } = await supabase.from('clients').select('voucher_count').eq('id', clientId).eq('outlet_id', outletID).single();
    if (!data) throw new Error('Client not found');
    if ((data.voucher_count ?? 0) < 1) throw new Error('No vouchers to redeem.');
    await supabase.from('clients').update({ voucher_count: (data.voucher_count || 0) - 1 }).eq('id', clientId);
  },
  decrementVoucherCount: async (clientId: string, amount: number, outletID = currentOutletID): Promise<void> => {
    if (amount <= 0) return;
    const { data } = await supabase.from('clients').select('voucher_count').eq('id', clientId).eq('outlet_id', outletID).single();
    if (!data) throw new Error('Client not found');
    await supabase.from('clients').update({ voucher_count: Math.max(0, (data.voucher_count || 0) - amount) }).eq('id', clientId);
  },
  delete: async (clientId: string, outletID = currentOutletID): Promise<void> => {
    const { error } = await supabase.from('clients').delete().eq('id', clientId).eq('outlet_id', outletID);
    if (error) throw new Error(error.message);
  },
  deleteByLastImportId: async (sessionId: string, outletID = currentOutletID): Promise<number> => {
    const { data } = await supabase.from('clients').select('id').eq('outlet_id', outletID).eq('last_import_id', sessionId);
    if (!data?.length) return 0;
    await supabase.from('clients').delete().eq('outlet_id', outletID).eq('last_import_id', sessionId);
    return data.length;
  },
  deleteAll: async (outletID = currentOutletID): Promise<number> => {
    const { data } = await supabase.from('clients').select('id').eq('outlet_id', outletID);
    if (!data?.length) return 0;
    await supabase.from('clients').delete().eq('outlet_id', outletID);
    return data.length;
  },
};

// ── STAFF SERVICE ──
export const staffService = {
  getAll: async (outletID = currentOutletID): Promise<Staff[]> => {
    if (!valid(outletID)) return [];
    const { data } = await supabase.from('staff').select('*').eq('outlet_id', outletID).order('created_at', { ascending: false });
    return (data || []).map(r => ({ ...r, outletID: r.outlet_id, createdAt: r.created_at, profilePicture: r.profile_picture, photoURL: r.photo_url, qualifiedServices: r.qualified_services } as unknown as Staff));
  },
  add: async (staff: any, outletID = currentOutletID): Promise<string> => {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('staff').insert({ id, outlet_id: outletID, name: staff.name, role: staff.role, email: staff.email, phone: staff.phone, profile_picture: staff.profilePicture, photo_url: staff.photoURL, qualified_services: staff.qualifiedServices });
    if (error) throw new Error(error.message);
    return id;
  },
  update: async (staffId: string, updates: any, outletID = currentOutletID): Promise<void> => {
    const mapped: any = {};
    for (const [k, v] of Object.entries(updates)) {
      if (k === 'outletID') mapped.outlet_id = v;
      else if (k === 'profilePicture') mapped.profile_picture = v;
      else if (k === 'photoURL') mapped.photo_url = v;
      else if (k === 'qualifiedServices') mapped.qualified_services = v;
      else if (k === 'createdAt') mapped.created_at = v;
      else mapped[k] = v;
    }
    const { error } = await supabase.from('staff').update(mapped).eq('id', staffId).eq('outlet_id', outletID);
    if (error) throw new Error(error.message);
  },
  delete: async (staffId: string, outletID = currentOutletID): Promise<void> => {
    const { error } = await supabase.from('staff').delete().eq('id', staffId).eq('outlet_id', outletID);
    if (error) throw new Error(error.message);
  },
};

// ── APPOINTMENT SERVICE ──
export const appointmentService = {
  getAll: async (outletID = currentOutletID): Promise<Appointment[]> => {
    const { data } = await supabase.from('appointments').select('*').eq('outlet_id', outletID).order('date', { ascending: false });
    return (data || []).map(r => ({ ...r, outletID: r.outlet_id, clientId: r.client_id, staffId: r.staff_id, serviceId: r.service_id, endTime: r.end_time, reminderSent: r.reminder_sent, isOnDuty: r.is_on_duty, sourceSaleId: r.source_sale_id, saleId: r.sale_id } as unknown as Appointment));
  },
  getDaily: async (date: string, outletID = currentOutletID): Promise<Appointment[]> => {
    if (!valid(outletID)) return [];
    const { data } = await supabase.from('appointments').select('*').eq('outlet_id', outletID).eq('date', date).order('time');
    return (data || []).map(r => ({ ...r, outletID: r.outlet_id, clientId: r.client_id, staffId: r.staff_id, serviceId: r.service_id, endTime: r.end_time } as unknown as Appointment));
  },
  add: async (appt: any, outletID = currentOutletID): Promise<string> => {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('appointments').insert({ id, outlet_id: outletID, client_id: appt.clientId, staff_id: appt.staffId, service_id: appt.serviceId, date: appt.date, time: appt.time, end_time: appt.endTime, status: appt.status || 'scheduled', is_on_duty: appt.isOnDuty, source_sale_id: appt.sourceSaleId, sale_id: appt.saleId, source: appt.source });
    if (error) throw new Error(error.message);
    return id;
  },
  setWithId: async (apptId: string, appt: any, outletID = currentOutletID): Promise<void> => {
    const { error } = await supabase.from('appointments').upsert({ id: apptId, outlet_id: outletID, client_id: appt.clientId, staff_id: appt.staffId, service_id: appt.serviceId, date: appt.date, time: appt.time, end_time: appt.endTime, status: appt.status || 'scheduled', source: appt.source });
    if (error) throw new Error(error.message);
  },
  update: async (apptId: string, updates: any, outletID = currentOutletID): Promise<void> => {
    const mapped: any = {};
    for (const [k, v] of Object.entries(updates)) {
      if (k === 'clientId') mapped.client_id = v;
      else if (k === 'staffId') mapped.staff_id = v;
      else if (k === 'serviceId') mapped.service_id = v;
      else if (k === 'endTime') mapped.end_time = v;
      else if (k === 'isOnDuty') mapped.is_on_duty = v;
      else if (k === 'sourceSaleId') mapped.source_sale_id = v;
      else if (k === 'saleId') mapped.sale_id = v;
      else mapped[k] = v;
    }
    await supabase.from('appointments').update(mapped).eq('id', apptId).eq('outlet_id', outletID);
  },
  updateStatus: async (apptId: string, status: string, outletID = currentOutletID): Promise<void> => {
    await supabase.from('appointments').update({ status }).eq('id', apptId).eq('outlet_id', outletID);
  },
  delete: async (apptId: string, outletID = currentOutletID): Promise<void> => {
    await supabase.from('appointments').delete().eq('id', apptId).eq('outlet_id', outletID);
  },
};

// ── TRANSACTION SERVICE ──
export const transactionService = {
  getAll: async (outletID = currentOutletID): Promise<Transaction[]> => {
    if (!valid(outletID)) return [];
    const { data } = await supabase.from('transactions').select('*').eq('outlet_id', outletID).order('date', { ascending: false });
    return (data || []).map(r => ({ ...r, outletID: r.outlet_id, clientId: r.client_id, paymentMethod: r.payment_method, parentSaleId: r.parent_sale_id, date: r.date } as unknown as Transaction));
  },
  add: async (txn: any, outletID = currentOutletID): Promise<string> => {
    if (!valid(outletID)) throw new Error('outletID required');
    const id = crypto.randomUUID();
    const dateVal = txn.date ? new Date(txn.date) : new Date();
    const validDate = !isNaN(dateVal.getTime()) ? dateVal.toISOString() : new Date().toISOString();
    const { error } = await supabase.from('transactions').insert({ id, outlet_id: outletID, type: txn.type, amount: Number(txn.amount), category: txn.category || '', description: txn.description || '', date: validDate, client_id: txn.clientId, items: txn.items, payment_method: txn.paymentMethod, parent_sale_id: txn.parentSaleId });
    if (error) throw new Error(error.message);
    return id;
  },
  update: async (txnId: string, updates: any, outletID = currentOutletID): Promise<void> => {
    const mapped: any = {};
    for (const [k, v] of Object.entries(updates)) {
      if (k === 'clientId') mapped.client_id = v;
      else if (k === 'paymentMethod') mapped.payment_method = v;
      else if (k === 'parentSaleId') mapped.parent_sale_id = v;
      else mapped[k] = v;
    }
    await supabase.from('transactions').update(mapped).eq('id', txnId).eq('outlet_id', outletID);
  },
  delete: async (txnId: string, outletID = currentOutletID): Promise<void> => {
    await supabase.from('transactions').delete().eq('id', txnId).eq('outlet_id', outletID);
  },
};

// ── SERVICE SERVICE ──
export const serviceService = {
  getAll: async (outletID = currentOutletID): Promise<Service[]> => {
    if (!valid(outletID)) return [];
    const { data } = await supabase.from('services').select('*').eq('outlet_id', outletID);
    const list = (data || []).map(r => ({ ...r, outletID: r.outlet_id, isCommissionable: r.is_commissionable, imageUrl: r.image_url, categoryId: r.category_id, iconId: r.icon_id, displayOrder: r.display_order, redeemPointsEnabled: r.redeem_points_enabled, redeemPoints: r.redeem_points, isVisible: r.is_visible, createdAt: r.created_at } as unknown as Service));
    return list.sort((a, b) => ((a as any).displayOrder ?? 0) - ((b as any).displayOrder ?? 0) || (a.name || '').localeCompare(b.name || ''));
  },
  add: async (service: any, outletID = currentOutletID): Promise<string> => {
    const id = crypto.randomUUID();
    const row: any = { id, outlet_id: outletID, name: service.name, price: service.price, duration: service.duration, category: service.category, points: service.points, is_commissionable: service.isCommissionable, description: service.description, image_url: service.imageUrl, icon_id: service.iconId, display_order: service.displayOrder, redeem_points_enabled: service.redeemPointsEnabled, redeem_points: service.redeemPoints, is_visible: service.isVisible };
    const { error } = await supabase.from('services').insert(row);
    if (error) throw new Error(error.message);
    return id;
  },
  update: async (serviceId: string, updates: any, outletID = currentOutletID): Promise<void> => {
    const mapped: any = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined) continue;
      if (k === 'isCommissionable') mapped.is_commissionable = v;
      else if (k === 'imageUrl') mapped.image_url = v;
      else if (k === 'displayOrder') mapped.display_order = v;
      else if (k === 'redeemPointsEnabled') mapped.redeem_points_enabled = v;
      else if (k === 'redeemPoints') mapped.redeem_points = v;
      else if (k === 'isVisible') mapped.is_visible = v;
      else if (k === 'iconId') mapped.icon_id = v;
      else if (k === 'categoryId') mapped.category_id = v;
      else mapped[k] = v;
    }
    await supabase.from('services').update(mapped).eq('id', serviceId).eq('outlet_id', outletID);
  },
  delete: async (serviceId: string, outletID = currentOutletID): Promise<void> => {
    await supabase.from('services').delete().eq('id', serviceId).eq('outlet_id', outletID);
  },
  updateCategoryName: async (outletID: string, oldName: string, newName: string): Promise<void> => {
    await supabase.from('services').update({ category: newName }).eq('outlet_id', outletID).eq('category', oldName);
  },
  updateDisplayOrder: async (updates: { id: string; displayOrder: number }[], outletID = currentOutletID): Promise<void> => {
    for (const u of updates) {
      await supabase.from('services').update({ display_order: u.displayOrder }).eq('id', u.id).eq('outlet_id', outletID);
    }
  },
};

// ── PRODUCT SERVICE ──
export const productService = {
  getAll: async (outletID = currentOutletID): Promise<Product[]> => {
    if (!valid(outletID)) return [];
    const { data } = await supabase.from('products').select('*').eq('outlet_id', outletID).order('name');
    return (data || []).map(r => ({ ...r, outletID: r.outlet_id, fixedCommissionAmount: r.fixed_commission_amount } as unknown as Product));
  },
  add: async (product: any, outletID = currentOutletID): Promise<string> => {
    const id = crypto.randomUUID();
    await supabase.from('products').insert({ id, outlet_id: outletID, name: product.name, price: product.price, stock: product.stock, category: product.category, fixed_commission_amount: product.fixedCommissionAmount });
    return id;
  },
  update: async (productId: string, updates: any, outletID = currentOutletID): Promise<void> => {
    const mapped: any = {};
    for (const [k, v] of Object.entries(updates)) {
      if (k === 'fixedCommissionAmount') mapped.fixed_commission_amount = v;
      else mapped[k] = v;
    }
    await supabase.from('products').update(mapped).eq('id', productId).eq('outlet_id', outletID);
  },
  delete: async (productId: string, outletID = currentOutletID): Promise<void> => {
    await supabase.from('products').delete().eq('id', productId).eq('outlet_id', outletID);
  },
  updateCategoryName: async (outletID: string, oldName: string, newName: string): Promise<void> => {
    await supabase.from('products').update({ category: newName }).eq('outlet_id', outletID).eq('category', oldName);
  },
};

// ── PACKAGE SERVICE ──
export const packageService = {
  getAll: async (outletID = currentOutletID): Promise<Package[]> => {
    if (!valid(outletID)) return [];
    const { data } = await supabase.from('packages').select('*').eq('outlet_id', outletID).order('name');
    return (data || []).map(r => ({ ...r, outletID: r.outlet_id, createdAt: r.created_at } as unknown as Package));
  },
  add: async (pkg: any, outletID = currentOutletID): Promise<string> => {
    const id = crypto.randomUUID();
    await supabase.from('packages').insert({ id, outlet_id: outletID, name: pkg.name, price: pkg.price, points: pkg.points, category: pkg.category, services: pkg.services, description: pkg.description });
    return id;
  },
  update: async (packageId: string, updates: any, outletID = currentOutletID): Promise<void> => {
    await supabase.from('packages').update(updates).eq('id', packageId).eq('outlet_id', outletID);
  },
  delete: async (packageId: string, outletID = currentOutletID): Promise<void> => {
    await supabase.from('packages').delete().eq('id', packageId).eq('outlet_id', outletID);
  },
  updateCategoryName: async (outletID: string, oldName: string, newName: string): Promise<void> => {
    await supabase.from('packages').update({ category: newName }).eq('outlet_id', outletID).eq('category', oldName);
  },
};

// ── REWARD SERVICE ──
export const rewardService = {
  getAll: async (outletID = currentOutletID): Promise<Reward[]> => {
    if (!valid(outletID)) return [];
    const { data } = await supabase.from('rewards').select('*').eq('outlet_id', outletID);
    return ((data || []).map(r => ({ ...r, outletID: r.outlet_id } as unknown as Reward))).sort((a, b) => a.cost - b.cost);
  },
  add: async (reward: any, outletID = currentOutletID): Promise<string> => {
    const id = crypto.randomUUID();
    await supabase.from('rewards').insert({ id, outlet_id: outletID, name: reward.name, cost: reward.cost, icon: reward.icon });
    return id;
  },
  update: async (rewardId: string, updates: any, outletID = currentOutletID): Promise<void> => {
    await supabase.from('rewards').update(updates).eq('id', rewardId).eq('outlet_id', outletID);
  },
  delete: async (rewardId: string, outletID = currentOutletID): Promise<void> => {
    await supabase.from('rewards').delete().eq('id', rewardId).eq('outlet_id', outletID);
  },
};

// ── OUTLET SERVICE ──
export const outletService = {
  getById: async (outletID: string): Promise<Outlet | null> => {
    const { data } = await supabase.from('outlets').select('*').eq('outlet_id', outletID).single();
    if (!data) return null;
    return { ...data, outletID: data.outlet_id, addressDisplay: data.address_display, phoneNumber: data.phone_number, businessHours: data.business_hours, serviceCategories: data.service_categories, bookingSlug: data.booking_slug, isActive: data.is_active, createdAt: data.created_at, updatedAt: data.updated_at } as unknown as Outlet;
  },
  getByBookingSlug: async (slug: string): Promise<Outlet | null> => {
    if (!slug?.trim()) return null;
    const { data } = await supabase.from('outlets').select('*').eq('booking_slug', slug.trim()).limit(1).single();
    if (!data) return null;
    return { ...data, outletID: data.outlet_id } as unknown as Outlet;
  },
  getAll: async (): Promise<Outlet[]> => {
    const { data } = await supabase.from('outlets').select('*');
    return (data || []).map(r => ({ ...r, outletID: r.outlet_id } as unknown as Outlet));
  },
  add: async (outlet: any): Promise<string> => {
    const id = crypto.randomUUID();
    await supabase.from('outlets').insert({ outlet_id: id, ...outlet });
    return id;
  },
  update: async (outletID: string, updates: any): Promise<void> => {
    const mapped: any = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined) continue;
      if (k === 'addressDisplay') mapped.address_display = v;
      else if (k === 'phoneNumber') mapped.phone_number = v;
      else if (k === 'businessHours') mapped.business_hours = v;
      else if (k === 'serviceCategories') mapped.service_categories = v;
      else if (k === 'bookingSlug') mapped.booking_slug = v;
      else if (k === 'isActive') mapped.is_active = v;
      else mapped[k] = v;
    }
    await supabase.from('outlets').upsert({ outlet_id: outletID, ...mapped });
  },
  getServiceCategories: async (outletID: string): Promise<string[]> => {
    const outlet = await outletService.getById(outletID);
    const list = outlet?.serviceCategories;
    return Array.isArray(list) ? [...list] : [];
  },
  updateServiceCategories: async (outletID: string, categories: string[]): Promise<void> => {
    await outletService.update(outletID, { serviceCategories: categories });
  },
};

// ── API INTEGRATION SERVICE ──
export const apiIntegrationService = {
  get: async (outletID = currentOutletID): Promise<ApiIntegration | null> => {
    if (!valid(outletID)) return null;
    const { data } = await supabase.from('api_integrations').select('*').eq('outlet_id', outletID).single();
    if (!data) return null;
    return { outletID: data.outlet_id, apiKeyHash: data.api_key_hash, keyPrefix: data.key_prefix, webhookUrl: data.webhook_url, updatedAt: data.updated_at } as ApiIntegration;
  },
  setApiKey: async (outletID: string, apiKeyHash: string, keyPrefix: string): Promise<void> => {
    await supabase.from('api_integrations').upsert({ outlet_id: outletID, api_key_hash: apiKeyHash, key_prefix: keyPrefix });
  },
  setWebhookUrl: async (outletID: string, webhookUrl: string): Promise<void> => {
    await supabase.from('api_integrations').upsert({ outlet_id: outletID, webhook_url: webhookUrl.trim() || null });
  },
};

// ── REALTIME SUBSCRIPTIONS ──
export function subscribeToTable(
  table: string,
  outletID: string,
  callback: (payload: any) => void
): RealtimeChannel {
  return supabase
    .channel(`${table}_${outletID}`)
    .on('postgres_changes', { event: '*', schema: 'public', table, filter: `outlet_id=eq.${outletID}` }, callback)
    .subscribe();
}
