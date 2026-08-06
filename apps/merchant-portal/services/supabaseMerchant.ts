/**
 * Merchant portal data access via Supabase (Phases 1–4).
 * Covers: staff, services, appointments, outlets, clients/ledgers, transactions,
 * products/packages/rewards, vouchers, api_integrations.
 * Maps snake_case DB ↔ camelCase app types.
 */
import { createBrowserSupabaseClient } from "@bookglow/supabase";
import { resolveDataProvider } from "@bookglow/shared-types";
import type {
  ApiIntegration,
  Appointment,
  CartItem,
  Client,
  OutstandingTransaction,
  Outlet,
  Package,
  PointTransaction,
  Product,
  Reward,
  Service,
  Staff,
  Transaction,
  Voucher,
  VoucherStatus,
} from "../types";
import { TransactionType } from "../types";
import { withQueryTelemetry } from "./queryTelemetry";

function viteEnv(): Record<string, string | undefined> {
  return import.meta.env as unknown as Record<string, string | undefined>;
}

export function isMerchantSupabaseData(): boolean {
  return resolveDataProvider(viteEnv()) === "supabase";
}

function client() {
  return createBrowserSupabaseClient(viteEnv());
}

/** Member list / POS typeahead — excludes notes and marketing blobs. */
const CLIENT_LIST_COLUMNS =
  "id,outlet_id,name,email,phone,points,credit,outstanding,member_tier,voucher_count,created_at,birthday,gender,source,tag";

/** Transaction list — excludes heavy `items` JSON until detail open. */
const TRANSACTION_LIST_COLUMNS =
  "id,outlet_id,date,type,client_id,amount,category,description,payment_method,parent_sale_id,status,voided,remarks,payment_status,outstanding,created_at";

/** Appointment list for calendar — all row columns are small; keep explicit. */
const APPOINTMENT_LIST_COLUMNS =
  "id,outlet_id,client_id,customer_id,staff_id,service_id,date,time,end_time,status,reminder_sent,is_on_duty,source_sale_id,sale_id,source,payment_status,completed_at,updated_at,created_at";

export const DEFAULT_LIST_PAGE_SIZE = 50;

function newId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function hasValidOutlet(outletID: string | undefined | null): boolean {
  return Boolean(outletID && String(outletID).trim());
}

let currentOutletID = "";

export function setCurrentOutletID(outletID: string) {
  currentOutletID = outletID || "";
}

export function getCurrentOutletID() {
  return currentOutletID;
}

function mapStaff(row: Record<string, unknown>): Staff {
  const qs = row.qualified_services;
  const weeklyHours = row.weekly_hours;
  const permissions = row.permissions;
  return {
    id: String(row.id),
    outletID: String(row.outlet_id || ""),
    name: String(row.name || ""),
    role: String(row.role || ""),
    email: String(row.email || ""),
    phone: String(row.phone || ""),
    createdAt: row.created_at ? String(row.created_at) : "",
    profilePicture: (row.profile_picture as string) || undefined,
    photoURL: (row.photo_url as string) || undefined,
    qualifiedServices: Array.isArray(qs)
      ? (qs as string[])
      : qs
        ? (qs as string[])
        : undefined,
    weeklyHours:
      weeklyHours && typeof weeklyHours === "object"
        ? (weeklyHours as Staff["weeklyHours"])
        : undefined,
    permissions:
      permissions && typeof permissions === "object"
        ? (permissions as Staff["permissions"])
        : undefined,
  };
}

function mapService(row: Record<string, unknown>): Service {
  return {
    id: String(row.id),
    outletID: String(row.outlet_id || ""),
    name: String(row.name || ""),
    price: Number(row.price ?? 0),
    duration: Number(row.duration ?? 60),
    category: String(row.category || ""),
    points: Number(row.points ?? 0),
    isCommissionable: Boolean(row.is_commissionable),
    description: (row.description as string) || undefined,
    imageUrl: (row.image_url as string) || undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    categoryId: (row.category_id as string) || undefined,
    iconId: (row.icon_id as string) || undefined,
    redeemPointsEnabled: Boolean(row.redeem_points_enabled),
    redeemPoints: Number(row.redeem_points ?? 0),
    isVisible: row.is_visible == null ? true : Boolean(row.is_visible),
    displayOrder: Number(row.display_order ?? 0),
  };
}

function mapAppointment(row: Record<string, unknown>): Appointment {
  return {
    id: String(row.id),
    outletID: String(row.outlet_id || ""),
    clientId: String(row.client_id || ""),
    staffId: String(row.staff_id || ""),
    serviceId: String(row.service_id || ""),
    date: String(row.date || ""),
    time: String(row.time || ""),
    endTime: (row.end_time as string) || undefined,
    status: (row.status as Appointment["status"]) || "scheduled",
    reminderSent: Boolean(row.reminder_sent),
    isOnDuty: Boolean(row.is_on_duty),
    sourceSaleId: (row.source_sale_id as string) || undefined,
    saleId: (row.sale_id as string) || undefined,
    paymentStatus: (row.payment_status as Appointment['paymentStatus']) || undefined,
    completedAt: (row.completed_at as string) || undefined,
    source: (row.source as string) || undefined,
  };
}

function mapOutlet(row: Record<string, unknown>): Outlet {
  return {
    outletID: String(row.outlet_id),
    name: String(row.name || ""),
    address: row.address as Outlet["address"],
    addressDisplay: (row.address_display as string) || undefined,
    phoneNumber: (row.phone_number as string) || undefined,
    phone: (row.phone as string) || undefined,
    email: (row.email as string) || undefined,
    website: (row.website as string) || undefined,
    timezone: (row.timezone as string) || undefined,
    businessHours: row.business_hours as Outlet["businessHours"],
    reviews: row.reviews as Outlet["reviews"],
    settings: row.settings as Outlet["settings"],
    serviceCategories: Array.isArray(row.service_categories)
      ? (row.service_categories as string[])
      : undefined,
    bookingSlug: (row.booking_slug as string) || undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    isActive: row.is_active == null ? true : Boolean(row.is_active),
  } as Outlet;
}

export const staffService = {
  getAll: async (outletID: string = currentOutletID): Promise<Staff[]> => {
    if (!hasValidOutlet(outletID)) return [];
    return withQueryTelemetry(
      { queryName: "staffService.getAll", resource: "staff" },
      async () => {
        const { data, error } = await client()
          .from("staff")
          .select("*")
          .eq("outlet_id", outletID);
        if (error) throw error;
        const list = (data || []).map((r) => mapStaff(r as Record<string, unknown>));
        list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        return list;
      },
    );
  },

  add: async (
    staff: Omit<Staff, "id" | "outletID"> & { outletID?: string },
    outletID: string = currentOutletID
  ): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const id = newId();
    const { error } = await client().from("staff").insert({
      id,
      outlet_id: outletID,
      name: staff.name || "",
      role: staff.role || null,
      email: staff.email || "",
      phone: staff.phone || "",
      profile_picture: staff.profilePicture || null,
      photo_url: staff.photoURL || staff.profilePicture || null,
      qualified_services: staff.qualifiedServices || null,
      weekly_hours: (staff.weeklyHours || null) as never,
      permissions: (staff.permissions || null) as never,
    });
    if (error) throw error;
    return id;
  },

  update: async (
    staffId: string,
    updates: Partial<Staff>,
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.role !== undefined) patch.role = updates.role;
    if (updates.email !== undefined) patch.email = updates.email;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.profilePicture !== undefined) patch.profile_picture = updates.profilePicture;
    if (updates.photoURL !== undefined) patch.photo_url = updates.photoURL;
    if (updates.qualifiedServices !== undefined) {
      patch.qualified_services = updates.qualifiedServices;
    }
    if (updates.weeklyHours !== undefined) {
      patch.weekly_hours = updates.weeklyHours || null;
    }
    if (updates.permissions !== undefined) {
      patch.permissions = updates.permissions || null;
    }
    const { error } = await client()
      .from("staff")
      .update(patch as never)
      .eq("id", staffId)
      .eq("outlet_id", outletID);
    if (error) throw error;
  },

  delete: async (staffId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const { error } = await client()
      .from("staff")
      .delete()
      .eq("id", staffId)
      .eq("outlet_id", outletID);
    if (error) throw error;
  },
};

export const serviceService = {
  getAll: async (outletID: string = currentOutletID): Promise<Service[]> => {
    if (!hasValidOutlet(outletID)) return [];
    return withQueryTelemetry(
      { queryName: "serviceService.getAll", resource: "services" },
      async () => {
        const { data, error } = await client()
          .from("services")
          .select("*")
          .eq("outlet_id", outletID);
        if (error) throw error;
        const list = (data || []).map((r) => mapService(r as Record<string, unknown>));
        return list.sort((a, b) => {
          const aOrder = a.displayOrder ?? 0;
          const bOrder = b.displayOrder ?? 0;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (a.name || "").localeCompare(b.name || "");
        });
      },
    );
  },

  add: async (service: Omit<Service, "id">, outletID: string = currentOutletID): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const id = newId();
    const { error } = await client().from("services").insert({
      id,
      outlet_id: outletID,
      name: service.name || "",
      price: service.price ?? 0,
      duration: service.duration ?? 60,
      category: service.category || "",
      category_id: service.categoryId || null,
      points: service.points ?? 0,
      is_commissionable: service.isCommissionable ?? false,
      description: service.description || null,
      image_url: service.imageUrl || null,
      icon_id: service.iconId || null,
      display_order: service.displayOrder ?? 0,
      redeem_points_enabled: service.redeemPointsEnabled ?? false,
      redeem_points: service.redeemPoints ?? 0,
      is_visible: service.isVisible ?? true,
    });
    if (error) throw error;
    return id;
  },

  update: async (
    serviceId: string,
    updates: Partial<Service>,
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.price !== undefined) patch.price = updates.price;
    if (updates.duration !== undefined) patch.duration = updates.duration;
    if (updates.category !== undefined) patch.category = updates.category;
    if (updates.categoryId !== undefined) patch.category_id = updates.categoryId;
    if (updates.points !== undefined) patch.points = updates.points;
    if (updates.isCommissionable !== undefined) patch.is_commissionable = updates.isCommissionable;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.imageUrl !== undefined) patch.image_url = updates.imageUrl;
    if (updates.iconId !== undefined) patch.icon_id = updates.iconId;
    if (updates.displayOrder !== undefined) patch.display_order = updates.displayOrder;
    if (updates.redeemPointsEnabled !== undefined) {
      patch.redeem_points_enabled = updates.redeemPointsEnabled;
    }
    if (updates.redeemPoints !== undefined) patch.redeem_points = updates.redeemPoints;
    if (updates.isVisible !== undefined) patch.is_visible = updates.isVisible;
    const { error } = await client()
      .from("services")
      .update(patch as never)
      .eq("id", serviceId)
      .eq("outlet_id", outletID);
    if (error) throw error;
  },

  delete: async (serviceId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const { error } = await client()
      .from("services")
      .delete()
      .eq("id", serviceId)
      .eq("outlet_id", outletID);
    if (error) throw error;
  },

  updateCategoryName: async (outletID: string, oldName: string, newName: string): Promise<void> => {
    if (!hasValidOutlet(outletID)) return;
    const { error } = await client()
      .from("services")
      .update({ category: newName })
      .eq("outlet_id", outletID)
      .eq("category", oldName);
    if (error) throw error;
  },

  updateDisplayOrder: async (
    updates: { id: string; displayOrder: number }[],
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    if (!updates.length) return;
    await Promise.all(
      updates.map(({ id, displayOrder }) =>
        client()
          .from("services")
          .update({ display_order: displayOrder })
          .eq("id", id)
          .eq("outlet_id", outletID)
      )
    );
  },
};

export const appointmentService = {
  getAll: async (outletID: string = currentOutletID): Promise<Appointment[]> => {
    if (!hasValidOutlet(outletID)) return [];
    return withQueryTelemetry(
      { queryName: "appointmentService.getAll", resource: "appointments" },
      async () => {
        const { data, error } = await client()
          .from("appointments")
          .select(APPOINTMENT_LIST_COLUMNS)
          .eq("outlet_id", outletID);
        if (error) throw error;
        const list = (data || []).map((r) => mapAppointment(r as Record<string, unknown>));
        list.sort((a, b) => {
          const aDate = a.date ? new Date(a.date + "T" + (a.time || "00:00")).getTime() : 0;
          const bDate = b.date ? new Date(b.date + "T" + (b.time || "00:00")).getTime() : 0;
          return bDate - aDate;
        });
        return list;
      },
    );
  },

  /** Inclusive date range (YYYY-MM-DD) for schedule views. */
  getInDateRange: async (
    startDate: string,
    endDate: string,
    outletID: string = currentOutletID,
  ): Promise<Appointment[]> => {
    if (!hasValidOutlet(outletID)) return [];
    return withQueryTelemetry(
      { queryName: "appointmentService.getInDateRange", resource: "appointments", trigger: "route_change" },
      async () => {
        const { data, error } = await client()
          .from("appointments")
          .select(APPOINTMENT_LIST_COLUMNS)
          .eq("outlet_id", outletID)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: true })
          .order("time", { ascending: true });
        if (error) throw error;
        return (data || []).map((r) => mapAppointment(r as Record<string, unknown>));
      },
    );
  },

  getByClient: async (
    clientId: string,
    outletID: string = currentOutletID,
    limit = DEFAULT_LIST_PAGE_SIZE,
  ): Promise<Appointment[]> => {
    if (!hasValidOutlet(outletID) || !clientId) return [];
    return withQueryTelemetry(
      { queryName: "appointmentService.getByClient", resource: "appointments" },
      async () => {
        const { data, error } = await client()
          .from("appointments")
          .select(APPOINTMENT_LIST_COLUMNS)
          .eq("outlet_id", outletID)
          .eq("client_id", clientId)
          .order("date", { ascending: false })
          .order("time", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return (data || []).map((r) => mapAppointment(r as Record<string, unknown>));
      },
    );
  },

  getById: async (id: string, outletID: string = currentOutletID): Promise<Appointment | null> => {
    if (!hasValidOutlet(outletID) || !id) return null;
    return withQueryTelemetry(
      { queryName: "appointmentService.getById", resource: "appointments" },
      async () => {
        const { data, error } = await client()
          .from("appointments")
          .select(APPOINTMENT_LIST_COLUMNS)
          .eq("outlet_id", outletID)
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return mapAppointment(data as Record<string, unknown>);
      },
    );
  },

  /** Appointments linked to a sale via sale_id or source_sale_id. */
  listBySaleId: async (saleId: string, outletID: string = currentOutletID): Promise<Appointment[]> => {
    if (!hasValidOutlet(outletID) || !saleId) return [];
    return withQueryTelemetry(
      { queryName: "appointmentService.listBySaleId", resource: "appointments" },
      async () => {
        const { data, error } = await client()
          .from("appointments")
          .select(APPOINTMENT_LIST_COLUMNS)
          .eq("outlet_id", outletID)
          .or(`sale_id.eq.${saleId},source_sale_id.eq.${saleId}`);
        if (error) throw error;
        return (data || []).map((r) => mapAppointment(r as Record<string, unknown>));
      },
    );
  },

  getDaily: async (date: string, outletID: string = currentOutletID): Promise<Appointment[]> => {
    if (!hasValidOutlet(outletID)) return [];
    return withQueryTelemetry(
      { queryName: "appointmentService.getDaily", resource: "appointments" },
      async () => {
        const { data, error } = await client()
          .from("appointments")
          .select(APPOINTMENT_LIST_COLUMNS)
          .eq("outlet_id", outletID)
          .eq("date", date)
          .order("time", { ascending: true });
        if (error) throw error;
        return (data || []).map((r) => mapAppointment(r as Record<string, unknown>));
      },
    );
  },

  getStaffSchedule: async (
    staffId: string,
    date: string,
    outletID: string = currentOutletID
  ): Promise<Appointment[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const { data, error } = await client()
      .from("appointments")
      .select("*")
      .eq("outlet_id", outletID)
      .eq("staff_id", staffId)
      .eq("date", date)
      .order("time", { ascending: true });
    if (error) throw error;
    return (data || []).map((r) => mapAppointment(r as Record<string, unknown>));
  },

  add: async (
    appointment: Omit<Appointment, "id"> | Appointment,
    outletID: string = currentOutletID
  ): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const { id: _omit, ...rest } = appointment as Appointment;
    const id = newId();
    const { error } = await client().from("appointments").insert({
      id,
      outlet_id: outletID,
      client_id: rest.clientId || null,
      staff_id: rest.staffId || null,
      service_id: rest.serviceId || null,
      date: rest.date,
      time: rest.time,
      end_time: rest.endTime || null,
      status: rest.status || "scheduled",
      reminder_sent: rest.reminderSent ?? false,
      is_on_duty: rest.isOnDuty ?? false,
      source_sale_id: rest.sourceSaleId || null,
      sale_id: rest.saleId || null,
      source: rest.source || null,
    });
    if (error) throw error;
    return id;
  },

  update: async (
    appointmentId: string,
    updates: Partial<Appointment>,
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const patch: Record<string, unknown> = {};
    if (updates.clientId !== undefined) patch.client_id = updates.clientId;
    if (updates.staffId !== undefined) patch.staff_id = updates.staffId;
    if (updates.serviceId !== undefined) patch.service_id = updates.serviceId;
    if (updates.date !== undefined) patch.date = updates.date;
    if (updates.time !== undefined) patch.time = updates.time;
    if (updates.endTime !== undefined) patch.end_time = updates.endTime;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.reminderSent !== undefined) patch.reminder_sent = updates.reminderSent;
    if (updates.isOnDuty !== undefined) patch.is_on_duty = updates.isOnDuty;
    if (updates.sourceSaleId !== undefined) patch.source_sale_id = updates.sourceSaleId;
    if (updates.saleId !== undefined) patch.sale_id = updates.saleId;
    if (updates.source !== undefined) patch.source = updates.source;
    const { data, error } = await client()
      .from("appointments")
      .update(patch as never)
      .eq("id", appointmentId)
      .eq("outlet_id", outletID)
      .select("id");
    if (error) throw error;
    if (!data?.length) {
      console.warn(`Appointment ${appointmentId} not found - may have been deleted. Skipping update.`);
    }
  },

  updateStatus: async (
    appointmentId: string,
    status: Appointment["status"],
    outletID: string = currentOutletID
  ): Promise<void> => {
    await appointmentService.update(appointmentId, { status }, outletID);
  },

  delete: async (appointmentId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const { error } = await client()
      .from("appointments")
      .delete()
      .eq("id", appointmentId)
      .eq("outlet_id", outletID);
    if (error) throw error;
  },

  /**
   * Delete a schedule appointment and, when linked, its POS sale + commission rows.
   * Prefer this over plain delete so Sales Reports stays in sync with Schedule.
   */
  deleteWithLinkedSale: async (
    appointmentId: string,
    outletID: string = currentOutletID,
  ): Promise<{ transactionId: string | null; saleDeleted: boolean; deletedAppointmentIds: string[] }> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const { data, error } = await client().rpc("delete_appointment_and_linked_sale", {
      p_appointment_id: appointmentId,
    });
    if (error) throw error;
    const payload = (data || {}) as Record<string, unknown>;
    const deletedAppointmentIds = Array.isArray(payload.deleted_appointment_ids)
      ? payload.deleted_appointment_ids.map(String)
      : [appointmentId];
    return {
      transactionId: payload.transaction_id != null ? String(payload.transaction_id) : null,
      saleDeleted: Boolean(payload.sale_deleted),
      deletedAppointmentIds,
    };
  },
};

export const outletService = {
  getById: async (outletID: string): Promise<Outlet | null> => {
    const { data, error } = await client()
      .from("outlets")
      .select("*")
      .eq("outlet_id", outletID)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapOutlet(data as Record<string, unknown>);
  },

  getByBookingSlug: async (slug: string): Promise<Outlet | null> => {
    const s = (slug || "").trim();
    if (!s) return null;
    const { data, error } = await client()
      .from("outlets")
      .select("*")
      .eq("booking_slug", s)
      .maybeSingle();
    if (error) throw error;
    if (data) return mapOutlet(data as Record<string, unknown>);
    const { data: all, error: err2 } = await client().from("outlets").select("*");
    if (err2) throw err2;
    const lower = s.toLowerCase();
    for (const row of all || []) {
      const r = row as Record<string, unknown>;
      const stored = String(r.booking_slug || "").trim();
      if (stored && stored.toLowerCase() === lower) return mapOutlet(r);
    }
    return null;
  },

  getAll: async (): Promise<Outlet[]> => {
    const { data, error } = await client().from("outlets").select("*");
    if (error) throw error;
    return (data || []).map((r) => mapOutlet(r as Record<string, unknown>));
  },

  add: async (_outlet: Omit<Outlet, "outletID">): Promise<string> => {
    throw new Error("Creating outlets via merchant portal is not enabled on Supabase yet.");
  },

  update: async (outletID: string, updates: Partial<Outlet>): Promise<void> => {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.address !== undefined) patch.address = updates.address;
    if (updates.addressDisplay !== undefined) patch.address_display = updates.addressDisplay;
    if (updates.phoneNumber !== undefined) patch.phone_number = updates.phoneNumber;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.email !== undefined) patch.email = updates.email;
    if (updates.website !== undefined) patch.website = updates.website;
    if (updates.timezone !== undefined) patch.timezone = updates.timezone;
    if (updates.businessHours !== undefined) patch.business_hours = updates.businessHours;
    if (updates.reviews !== undefined) patch.reviews = updates.reviews;
    if (updates.settings !== undefined) patch.settings = updates.settings;
    if (updates.serviceCategories !== undefined) {
      patch.service_categories = updates.serviceCategories;
    }
    if (updates.bookingSlug !== undefined) patch.booking_slug = updates.bookingSlug;
    const { error } = await client().from("outlets").update(patch as never).eq("outlet_id", outletID);
    if (error) throw error;
  },

  getServiceCategories: async (outletID: string): Promise<string[]> => {
    const outlet = await outletService.getById(outletID);
    const list = outlet?.serviceCategories;
    return Array.isArray(list) ? [...list] : [];
  },

  updateServiceCategories: async (outletID: string, categories: string[]): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    await outletService.update(outletID, { serviceCategories: categories });
  },
};

/** Load portal user profile (users table). */
export async function fetchPortalUserProfile(uid: string): Promise<{
  uid: string;
  email: string | null;
  outletId: string | null;
  role: string | null;
  displayName: string | null;
  outletName: string | null;
} | null> {
  const sb = client();
  const { data, error } = await sb.from("users").select("*").eq("uid", uid).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  let outletName: string | null = null;
  const outletId = row.outlet_id ? String(row.outlet_id) : null;
  if (outletId) {
    try {
      const outlet = await outletService.getById(outletId);
      outletName = outlet?.name || null;
    } catch {
      // ignore
    }
  }
  return {
    uid: String(row.uid),
    email: row.email ? String(row.email) : null,
    outletId,
    role: row.role ? String(row.role) : "cashier",
    displayName: row.display_name ? String(row.display_name) : null,
    outletName,
  };
}

function mapClient(row: Record<string, unknown>): Client {
  return {
    id: String(row.id),
    outletID: String(row.outlet_id || ""),
    name: String(row.name || ""),
    email: String(row.email || ""),
    phone: String(row.phone || ""),
    notes: String(row.notes || ""),
    createdAt: row.created_at ? String(row.created_at) : "",
    points: Number(row.points ?? 0),
    birthday: (row.birthday as string) || undefined,
    gender: (row.gender as string) || undefined,
    source: (row.source as string) || undefined,
    ic: (row.ic as string) || undefined,
    marital: (row.marital as string) || undefined,
    tag: (row.tag as string) || undefined,
    ethnic: (row.ethnic as string) || undefined,
    memberTier: (row.member_tier as string) || undefined,
    voucherCount: Number(row.voucher_count ?? 0),
    credit: Number(row.credit ?? 0),
    outstanding: Number(row.outstanding ?? 0),
    lastImportId: (row.last_import_id as string) || undefined,
    marketingEmailConsent: Boolean(row.marketing_email_consent),
    marketingSmsConsent: Boolean(row.marketing_sms_consent),
    marketingWhatsappConsent: Boolean(row.marketing_whatsapp_consent),
    marketingUnsubscribedAt: (row.marketing_unsubscribed_at as string) || undefined,
  };
}

export const clientService = {
  getAll: async (outletID: string = currentOutletID): Promise<Client[]> => {
    if (!hasValidOutlet(outletID)) return [];
    return withQueryTelemetry(
      { queryName: "clientService.getAll", resource: "clients" },
      async () => {
        const { data, error } = await client()
          .from("clients")
          .select(CLIENT_LIST_COLUMNS)
          .eq("outlet_id", outletID)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []).map((r) => mapClient(r as Record<string, unknown>));
      },
    );
  },

  /** First page for Members / CRM. */
  listPage: async (
    outletID: string = currentOutletID,
    options: { limit?: number; offset?: number } = {},
  ): Promise<Client[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const limit = options.limit ?? DEFAULT_LIST_PAGE_SIZE;
    const offset = options.offset ?? 0;
    return withQueryTelemetry(
      { queryName: "clientService.listPage", resource: "clients", trigger: "pagination" },
      async () => {
        const { data, error } = await client()
          .from("clients")
          .select(CLIENT_LIST_COLUMNS)
          .eq("outlet_id", outletID)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + limit - 1);
        if (error) throw error;
        return (data || []).map((r) => mapClient(r as Record<string, unknown>));
      },
    );
  },

  /** Server-side member search for POS / CRM typeahead. Does not log the query string. */
  search: async (
    query: string,
    outletID: string = currentOutletID,
    limit = 20,
  ): Promise<Client[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const q = (query || "").trim();
    if (q.length < 1) return [];
    // Strip PostgREST filter metacharacters; never log the raw query in telemetry.
    const safe = q.replace(/[%_,.()]+/g, ' ').replace(/["']/g, ' ').replace(/\s+/g, ' ').trim();
    if (!safe) return [];
    return withQueryTelemetry(
      { queryName: "clientService.search", resource: "clients", trigger: "search" },
      async () => {
        const digits = safe.replace(/\D/g, "");
        let builder = client()
          .from("clients")
          .select(CLIENT_LIST_COLUMNS)
          .eq("outlet_id", outletID)
          .order("name", { ascending: true })
          .limit(limit);

        if (digits.length >= 2) {
          builder = builder.or(
            `name.ilike.%${safe}%,phone.ilike.%${digits}%,email.ilike.%${safe}%`,
          );
        } else {
          builder = builder.or(`name.ilike.%${safe}%,email.ilike.%${safe}%`);
        }

        const { data, error } = await builder;
        if (error) throw error;
        return (data || []).map((r) => mapClient(r as Record<string, unknown>));
      },
    );
  },

  getById: async (clientId: string, outletID: string = currentOutletID): Promise<Client | null> => {
    if (!hasValidOutlet(outletID)) return null;
    return withQueryTelemetry(
      { queryName: "clientService.getById", resource: "clients" },
      async () => {
        const { data, error } = await client()
          .from("clients")
          .select("*")
          .eq("id", clientId)
          .eq("outlet_id", outletID)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return mapClient(data as Record<string, unknown>);
      },
    );
  },

  add: async (
    member: Omit<Client, "id" | "points" | "outletID"> & { points?: number; outletID?: string },
    outletID: string = currentOutletID
  ): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const id = newId();
    const initialPoints = typeof member.points === "number" && member.points >= 0 ? member.points : 0;
    const createdAt =
      (member as { createdAt?: string }).createdAt || new Date().toISOString();
    const { error } = await client().from("clients").insert({
      id,
      outlet_id: outletID,
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      notes: member.notes || "",
      points: initialPoints,
      credit: 0,
      voucher_count: 0,
      outstanding: 0,
      birthday: member.birthday || null,
      gender: member.gender || null,
      source: member.source || null,
      ic: member.ic || null,
      marital: member.marital || null,
      tag: member.tag || null,
      ethnic: member.ethnic || null,
      member_tier: member.memberTier || null,
      last_import_id: member.lastImportId || null,
      marketing_email_consent: Boolean(member.marketingEmailConsent),
      marketing_sms_consent: Boolean(member.marketingSmsConsent),
      marketing_whatsapp_consent: Boolean(member.marketingWhatsappConsent),
      marketing_unsubscribed_at: member.marketingUnsubscribedAt || null,
      created_at: createdAt,
    });
    if (error) throw error;
    return id;
  },

  update: async (
    clientId: string,
    updates: Partial<Client>,
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.email !== undefined) patch.email = updates.email;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.notes !== undefined) patch.notes = updates.notes;
    if (updates.points !== undefined) patch.points = updates.points;
    if (updates.birthday !== undefined) patch.birthday = updates.birthday;
    if (updates.gender !== undefined) patch.gender = updates.gender;
    if (updates.source !== undefined) patch.source = updates.source;
    if (updates.ic !== undefined) patch.ic = updates.ic;
    if (updates.marital !== undefined) patch.marital = updates.marital;
    if (updates.tag !== undefined) patch.tag = updates.tag;
    if (updates.ethnic !== undefined) patch.ethnic = updates.ethnic;
    if (updates.memberTier !== undefined) patch.member_tier = updates.memberTier;
    if (updates.voucherCount !== undefined) patch.voucher_count = updates.voucherCount;
    if (updates.credit !== undefined) patch.credit = updates.credit;
    if (updates.outstanding !== undefined) patch.outstanding = updates.outstanding;
    if (updates.lastImportId !== undefined) patch.last_import_id = updates.lastImportId;
    if (updates.marketingEmailConsent !== undefined) patch.marketing_email_consent = updates.marketingEmailConsent;
    if (updates.marketingSmsConsent !== undefined) patch.marketing_sms_consent = updates.marketingSmsConsent;
    if (updates.marketingWhatsappConsent !== undefined) patch.marketing_whatsapp_consent = updates.marketingWhatsappConsent;
    if (updates.marketingUnsubscribedAt !== undefined) patch.marketing_unsubscribed_at = updates.marketingUnsubscribedAt;
    if (updates.createdAt !== undefined) patch.created_at = updates.createdAt;
    const { error } = await client()
      .from("clients")
      .update(patch as never)
      .eq("id", clientId)
      .eq("outlet_id", outletID);
    if (error) throw error;
  },

  incrementVoucherCount: async (
    clientId: string,
    delta: number,
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID) || delta <= 0) return;
    const existing = await clientService.getById(clientId, outletID);
    if (!existing) throw new Error("Client not found");
    await clientService.update(
      clientId,
      { voucherCount: (existing.voucherCount ?? 0) + delta },
      outletID
    );
  },

  redeemVoucher: async (clientId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const existing = await clientService.getById(clientId, outletID);
    if (!existing) throw new Error("Client not found");
    const current = Number(existing.voucherCount ?? 0);
    if (current < 1) throw new Error("Member has no vouchers to redeem.");
    await clientService.update(clientId, { voucherCount: current - 1 }, outletID);
  },

  decrementVoucherCount: async (
    clientId: string,
    amount: number,
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID) || amount <= 0) return;
    const existing = await clientService.getById(clientId, outletID);
    if (!existing) throw new Error("Client not found");
    const current = Number(existing.voucherCount ?? 0);
    await clientService.update(
      clientId,
      { voucherCount: Math.max(0, current - amount) },
      outletID
    );
  },

  updatePoints: async (
    clientId: string,
    pointsChange: number,
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const type = pointsChange >= 0 ? "Topup" : "Redeem";
    const amount = Math.abs(pointsChange);
    if (amount === 0) return;
    const { error } = await client().rpc("merchant_adjust_client_points", {
      p_client_id: clientId,
      p_outlet_id: outletID,
      p_type: type,
      p_amount: amount,
      p_is_manual: true,
      p_description: null,
    });
    if (error) throw error;
  },

  updatePointsForSale: async (
    clientId: string,
    pointsToAdd: number,
    saleId: string,
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID) || pointsToAdd <= 0) return;
    const { error } = await client().rpc("merchant_credit_points_for_sale", {
      p_client_id: clientId,
      p_sale_id: saleId,
      p_points: pointsToAdd,
      p_outlet_id: outletID,
    });
    if (error) throw error;
  },

  delete: async (clientId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const { error } = await client()
      .from("clients")
      .delete()
      .eq("id", clientId)
      .eq("outlet_id", outletID);
    if (error) throw error;
  },

  deleteByLastImportId: async (
    sessionId: string,
    outletID: string = currentOutletID
  ): Promise<number> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const { data, error } = await client()
      .from("clients")
      .delete()
      .eq("outlet_id", outletID)
      .eq("last_import_id", sessionId)
      .select("id");
    if (error) throw error;
    return data?.length ?? 0;
  },

  deleteAll: async (outletID: string = currentOutletID): Promise<number> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const { data, error } = await client()
      .from("clients")
      .delete()
      .eq("outlet_id", outletID)
      .select("id");
    if (error) throw error;
    return data?.length ?? 0;
  },
};

function mapPointTxn(row: Record<string, unknown>): PointTransaction {
  return {
    id: String(row.id),
    clientId: String(row.client_id || ""),
    outletID: String(row.outlet_id || ""),
    type: String(row.type || "") as PointTransaction["type"],
    amount: Number(row.amount ?? 0),
    previousBalance: Number(row.previous_balance ?? 0),
    newBalance: Number(row.new_balance ?? 0),
    timestamp: row.timestamp ? String(row.timestamp) : "",
    isManual: Boolean(row.is_manual),
    description: (row.description as string) || undefined,
  };
}

function mapOutstandingTxn(row: Record<string, unknown>): OutstandingTransaction {
  return {
    id: String(row.id),
    clientId: String(row.client_id || ""),
    outletID: String(row.outlet_id || ""),
    type: String(row.type || "") as OutstandingTransaction["type"],
    amount: Number(row.amount ?? 0),
    previousBalance: Number(row.previous_balance ?? 0),
    newBalance: Number(row.new_balance ?? 0),
    timestamp: row.timestamp ? String(row.timestamp) : "",
    isManual: Boolean(row.is_manual),
    description: (row.description as string) || undefined,
  };
}

export const pointTransactionService = {
  getAll: async (clientId: string, outletID: string = currentOutletID): Promise<PointTransaction[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const { data, error } = await client()
      .from("point_transactions")
      .select("*")
      .eq("client_id", clientId)
      .eq("outlet_id", outletID)
      .order("timestamp", { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => mapPointTxn(r as Record<string, unknown>));
  },

  add: async (
    clientId: string,
    type: "Topup" | "Redeem",
    amount: number,
    outletID: string = currentOutletID
  ): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    if (amount <= 0) throw new Error("Amount must be positive.");
    const { data, error } = await client().rpc("merchant_adjust_client_points", {
      p_client_id: clientId,
      p_outlet_id: outletID,
      p_type: type,
      p_amount: amount,
      p_is_manual: true,
      p_description: null,
    });
    if (error) throw error;
    return String(data);
  },

  deductForSaleDeletion: async (
    clientId: string,
    pointsToDeduct: number,
    receiptNumber: string,
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID) || pointsToDeduct <= 0) return;
    const { error } = await client().rpc("merchant_adjust_client_points", {
      p_client_id: clientId,
      p_outlet_id: outletID,
      p_type: "Deduction (Sale Deleted)",
      p_amount: pointsToDeduct,
      p_is_manual: false,
      p_description: `Receipt #${receiptNumber}`,
    });
    if (error) throw error;
  },
};

export const outstandingTransactionService = {
  getAll: async (
    clientId: string,
    outletID: string = currentOutletID
  ): Promise<OutstandingTransaction[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const { data, error } = await client()
      .from("outstanding_transactions")
      .select("*")
      .eq("client_id", clientId)
      .eq("outlet_id", outletID)
      .order("timestamp", { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => mapOutstandingTxn(r as Record<string, unknown>));
  },

  add: async (
    clientId: string,
    type: "Add" | "Minus",
    amount: number,
    outletID: string = currentOutletID,
    timestamp?: string
  ): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    if (amount <= 0) throw new Error("Amount must be positive.");
    const { data, error } = await client().rpc("merchant_adjust_client_outstanding", {
      p_client_id: clientId,
      p_outlet_id: outletID,
      p_type: type,
      p_amount: amount,
      p_timestamp: timestamp || new Date().toISOString(),
    });
    if (error) throw error;
    return String(data);
  },
};

export async function listCreditHistory(
  clientId: string,
  outletID: string = currentOutletID
): Promise<
  {
    id: string;
    type: "topup" | "deduction";
    amount: number;
    newBalance: number;
    staffRemark: string;
    staffName: string;
    timestamp: string;
    transactionId?: string;
  }[]
> {
  if (!hasValidOutlet(outletID)) return [];
  const { data, error } = await client()
    .from("credit_history")
    .select("*")
    .eq("client_id", clientId)
    .order("timestamp", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      type: (String(r.type || "topup").toLowerCase() === "deduction"
        ? "deduction"
        : "topup") as "topup" | "deduction",
      amount: Number(r.amount ?? 0),
      newBalance: Number(r.new_balance ?? 0),
      staffRemark: String(r.staff_remark || ""),
      staffName: String(r.staff_name || ""),
      timestamp: r.timestamp ? String(r.timestamp) : "",
      transactionId: (r.transaction_id as string) || undefined,
    };
  });
}

export async function adjustClientCredit(input: {
  clientId: string;
  outletID: string;
  type: "topup" | "deduction";
  amount: number;
  staffRemark: string;
  staffName: string;
  transactionId?: string;
}): Promise<number> {
  const { data, error } = await client().rpc("merchant_adjust_client_credit", {
    p_client_id: input.clientId,
    p_outlet_id: input.outletID,
    p_type: input.type,
    p_amount: Math.abs(input.amount),
    p_staff_remark: input.staffRemark || null,
    p_staff_name: input.staffName || null,
    p_transaction_id: input.transactionId || null,
  });
  if (error) throw error;
  return Number(data);
}

function mapTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    outletID: String(row.outlet_id || ""),
    date: row.date ? String(row.date) : "",
    type: (row.type as TransactionType) || TransactionType.SALE,
    clientId: (row.client_id as string) || undefined,
    items: (row.items as CartItem[]) || undefined,
    amount: Number(row.amount ?? 0),
    category: String(row.category || ""),
    description: String(row.description || ""),
    paymentMethod: (row.payment_method as string) || undefined,
    parentSaleId: (row.parent_sale_id as string) || undefined,
    status: (row.status as string) || undefined,
    remarks: (row.remarks as string) || undefined,
    paymentStatus: (row.payment_status as string) || undefined,
    outstanding: row.outstanding != null ? Number(row.outstanding) : undefined,
  };
}

export const transactionService = {
  completePosSale: async (txn: Transaction, outletID: string = currentOutletID): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const { data, error } = await client().rpc("complete_pos_sale", {
      p_transaction: {
        id: txn.id, outlet_id: outletID, date: txn.date, type: txn.type,
        client_id: txn.clientId || null, items: txn.items || null, amount: txn.amount,
        category: txn.category, description: txn.description,
        payment_method: txn.paymentMethod || null, status: txn.status || null,
        remarks: txn.remarks || null, payment_status: txn.paymentStatus || 'paid',
        outstanding: txn.outstanding || 0,
      },
      p_appointment_id: txn.appointmentId || null,
    } as never);
    if (error) throw error;
    return String((data as any)?.transaction_id || txn.id);
  },

  voidSale: async (transactionId: string, reason: string, outletID: string = currentOutletID): Promise<string[]> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const { data, error } = await client().rpc("void_sale_and_remove_linked_appointments", {
      p_transaction_id: transactionId,
      p_reason: reason,
    } as never);
    if (error) throw error;
    return Array.isArray((data as any)?.appointment_ids) ? (data as any).appointment_ids.map(String) : [];
  },
  getAll: async (outletID: string = currentOutletID): Promise<Transaction[]> => {
    if (!hasValidOutlet(outletID)) return [];
    return withQueryTelemetry(
      { queryName: "transactionService.getAll", resource: "transactions" },
      async () => {
        const { data, error } = await client()
          .from("transactions")
          .select(TRANSACTION_LIST_COLUMNS)
          .eq("outlet_id", outletID)
          .order("date", { ascending: false });
        if (error) throw error;
        return (data || []).map((r) => mapTransaction(r as Record<string, unknown>));
      },
    );
  },

  /** Date-bounded list (ISO timestamps) without line-item JSON. */
  getInDateRange: async (
    startIso: string,
    endIso: string,
    outletID: string = currentOutletID,
    options: { limit?: number; offset?: number; type?: string } = {},
  ): Promise<Transaction[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const limit = options.limit ?? DEFAULT_LIST_PAGE_SIZE;
    const offset = options.offset ?? 0;
    return withQueryTelemetry(
      { queryName: "transactionService.getInDateRange", resource: "transactions", trigger: "pagination" },
      async () => {
        let builder = client()
          .from("transactions")
          .select(TRANSACTION_LIST_COLUMNS)
          .eq("outlet_id", outletID)
          .gte("date", startIso)
          .lte("date", endIso)
          .order("date", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + limit - 1);
        if (options.type) builder = builder.eq("type", options.type);
        const { data, error } = await builder;
        if (error) throw error;
        return (data || []).map((r) => mapTransaction(r as Record<string, unknown>));
      },
    );
  },

  getByClient: async (
    clientId: string,
    outletID: string = currentOutletID,
    limit = DEFAULT_LIST_PAGE_SIZE,
  ): Promise<Transaction[]> => {
    if (!hasValidOutlet(outletID) || !clientId) return [];
    return withQueryTelemetry(
      { queryName: "transactionService.getByClient", resource: "transactions" },
      async () => {
        const { data, error } = await client()
          .from("transactions")
          .select(TRANSACTION_LIST_COLUMNS)
          .eq("outlet_id", outletID)
          .eq("client_id", clientId)
          .order("date", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return (data || []).map((r) => mapTransaction(r as Record<string, unknown>));
      },
    );
  },

  /** Full row including `items` — open transaction detail only. */
  getById: async (id: string, outletID: string = currentOutletID): Promise<Transaction | null> => {
    if (!hasValidOutlet(outletID) || !id) return null;
    return withQueryTelemetry(
      { queryName: "transactionService.getById", resource: "transactions" },
      async () => {
        const { data, error } = await client()
          .from("transactions")
          .select("*")
          .eq("outlet_id", outletID)
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return mapTransaction(data as Record<string, unknown>);
      },
    );
  },

  /** Child rows (e.g. commission expenses) linked via parent_sale_id. */
  listByParentSaleId: async (
    parentSaleId: string,
    outletID: string = currentOutletID,
  ): Promise<Transaction[]> => {
    if (!hasValidOutlet(outletID) || !parentSaleId) return [];
    return withQueryTelemetry(
      { queryName: "transactionService.listByParentSaleId", resource: "transactions" },
      async () => {
        const { data, error } = await client()
          .from("transactions")
          .select(TRANSACTION_LIST_COLUMNS)
          .eq("outlet_id", outletID)
          .eq("parent_sale_id", parentSaleId);
        if (error) throw error;
        return (data || []).map((r) => mapTransaction(r as Record<string, unknown>));
      },
    );
  },

  getDailySales: async (date: string, outletID: string = currentOutletID): Promise<Transaction[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return withQueryTelemetry(
      { queryName: "transactionService.getDailySales", resource: "transactions" },
      async () => {
        const { data, error } = await client()
          .from("transactions")
          .select(TRANSACTION_LIST_COLUMNS)
          .eq("outlet_id", outletID)
          .eq("type", TransactionType.SALE)
          .gte("date", start.toISOString())
          .lte("date", end.toISOString())
          .order("date", { ascending: false });
        if (error) throw error;
        return (data || []).map((r) => mapTransaction(r as Record<string, unknown>));
      },
    );
  },

  add: async (
    txn: Omit<Transaction, "id">,
    outletID: string = currentOutletID
  ): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const id = newId();
    const dateValue = txn.date ? new Date(txn.date) : new Date();
    const validDate = !isNaN(dateValue.getTime()) ? dateValue : new Date();
    const { error } = await client().from("transactions").insert({
      id,
      outlet_id: String(outletID).trim(),
      date: validDate.toISOString(),
      type: txn.type,
      client_id: txn.clientId || null,
      items: (txn.items ? JSON.parse(JSON.stringify(txn.items)) : null) as never,
      amount: Number(txn.amount) || 0,
      category: txn.category ?? "",
      description: txn.description ?? "",
      payment_method: txn.paymentMethod || null,
      parent_sale_id: txn.parentSaleId || null,
      status: txn.status || null,
      voided: txn.status === "voided",
      remarks: txn.remarks || null,
      payment_status: txn.paymentStatus || null,
      outstanding: txn.outstanding ?? 0,
    });
    if (error) throw error;
    return id;
  },

  update: async (
    transactionId: string,
    updates: Partial<Transaction>,
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const patch: Record<string, unknown> = {};
    if (updates.date !== undefined) {
      const d = new Date(updates.date);
      patch.date = !isNaN(d.getTime()) ? d.toISOString() : updates.date;
    }
    if (updates.type !== undefined) patch.type = updates.type;
    if (updates.clientId !== undefined) patch.client_id = updates.clientId;
    if (updates.items !== undefined) patch.items = updates.items;
    if (updates.amount !== undefined) patch.amount = updates.amount;
    if (updates.category !== undefined) patch.category = updates.category;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.paymentMethod !== undefined) patch.payment_method = updates.paymentMethod;
    if (updates.parentSaleId !== undefined) patch.parent_sale_id = updates.parentSaleId;
    if (updates.status !== undefined) {
      patch.status = updates.status;
      patch.voided = updates.status === "voided";
    }
    if (updates.remarks !== undefined) patch.remarks = updates.remarks;
    if (updates.paymentStatus !== undefined) patch.payment_status = updates.paymentStatus;
    if (updates.outstanding !== undefined) patch.outstanding = updates.outstanding;
    const { error } = await client()
      .from("transactions")
      .update(patch as never)
      .eq("id", transactionId)
      .eq("outlet_id", outletID);
    if (error) throw error;
  },

  delete: async (transactionId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const { error } = await client()
      .from("transactions")
      .delete()
      .eq("id", transactionId)
      .eq("outlet_id", outletID);
    if (error) throw error;
  },
};

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    outletID: String(row.outlet_id || ""),
    name: String(row.name || ""),
    price: Number(row.price ?? 0),
    stock: Number(row.stock ?? 0),
    category: String(row.category || ""),
    fixedCommissionAmount:
      row.fixed_commission_amount != null ? Number(row.fixed_commission_amount) : undefined,
  };
}

export const productService = {
  getAll: async (outletID: string = currentOutletID): Promise<Product[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const { data, error } = await client()
      .from("products")
      .select("*")
      .eq("outlet_id", outletID)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data || []).map((r) => mapProduct(r as Record<string, unknown>));
  },

  add: async (product: Omit<Product, "id">, outletID: string = currentOutletID): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const id = newId();
    const { error } = await client().from("products").insert({
      id,
      outlet_id: outletID,
      name: product.name || "",
      price: product.price ?? 0,
      stock: product.stock ?? 0,
      category: product.category || "",
      fixed_commission_amount: product.fixedCommissionAmount ?? null,
    });
    if (error) throw error;
    return id;
  },

  update: async (
    productId: string,
    updates: Partial<Product>,
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.price !== undefined) patch.price = updates.price;
    if (updates.stock !== undefined) patch.stock = updates.stock;
    if (updates.category !== undefined) patch.category = updates.category;
    if (updates.fixedCommissionAmount !== undefined) {
      patch.fixed_commission_amount = updates.fixedCommissionAmount;
    }
    const { error } = await client()
      .from("products")
      .update(patch as never)
      .eq("id", productId)
      .eq("outlet_id", outletID);
    if (error) throw error;
  },

  delete: async (productId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const { error } = await client()
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("outlet_id", outletID);
    if (error) throw error;
  },

  updateCategoryName: async (outletID: string, oldName: string, newName: string): Promise<void> => {
    if (!hasValidOutlet(outletID)) return;
    const { error } = await client()
      .from("products")
      .update({ category: newName })
      .eq("outlet_id", outletID)
      .eq("category", oldName);
    if (error) throw error;
  },
};

function mapPackage(row: Record<string, unknown>): Package {
  return {
    id: String(row.id),
    outletID: String(row.outlet_id || ""),
    name: String(row.name || ""),
    price: Number(row.price ?? 0),
    points: Number(row.points ?? 0),
    category: String(row.category || ""),
    services: Array.isArray(row.services) ? (row.services as Package["services"]) : [],
    description: (row.description as string) || undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

export const packageService = {
  getAll: async (outletID: string = currentOutletID): Promise<Package[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const { data, error } = await client()
      .from("packages")
      .select("*")
      .eq("outlet_id", outletID)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data || []).map((r) => mapPackage(r as Record<string, unknown>));
  },

  add: async (pkg: Omit<Package, "id">, outletID: string = currentOutletID): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const id = newId();
    const { error } = await client().from("packages").insert({
      id,
      outlet_id: outletID,
      name: pkg.name || "",
      price: pkg.price ?? 0,
      points: pkg.points ?? 0,
      category: pkg.category || "",
      services: JSON.parse(JSON.stringify(pkg.services || [])) as never,
      description: pkg.description || null,
    });
    if (error) throw error;
    return id;
  },

  update: async (
    packageId: string,
    updates: Partial<Package>,
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.price !== undefined) patch.price = updates.price;
    if (updates.points !== undefined) patch.points = updates.points;
    if (updates.category !== undefined) patch.category = updates.category;
    if (updates.services !== undefined) patch.services = updates.services;
    if (updates.description !== undefined) patch.description = updates.description;
    const { error } = await client()
      .from("packages")
      .update(patch as never)
      .eq("id", packageId)
      .eq("outlet_id", outletID);
    if (error) throw error;
  },

  delete: async (packageId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const { error } = await client()
      .from("packages")
      .delete()
      .eq("id", packageId)
      .eq("outlet_id", outletID);
    if (error) throw error;
  },

  updateCategoryName: async (outletID: string, oldName: string, newName: string): Promise<void> => {
    if (!hasValidOutlet(outletID)) return;
    const { error } = await client()
      .from("packages")
      .update({ category: newName })
      .eq("outlet_id", outletID)
      .eq("category", oldName);
    if (error) throw error;
  },
};

function mapReward(row: Record<string, unknown>): Reward {
  return {
    id: String(row.id),
    outletID: String(row.outlet_id || ""),
    name: String(row.name || ""),
    cost: Number(row.cost ?? 0),
    icon: String(row.icon || ""),
  };
}

export const rewardService = {
  getAll: async (outletID: string = currentOutletID): Promise<Reward[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const { data, error } = await client().from("rewards").select("*").eq("outlet_id", outletID);
    if (error) throw error;
    return (data || [])
      .map((r) => mapReward(r as Record<string, unknown>))
      .sort((a, b) => a.cost - b.cost);
  },

  add: async (reward: Omit<Reward, "id">, outletID: string = currentOutletID): Promise<string> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const id = newId();
    const { error } = await client().from("rewards").insert({
      id,
      outlet_id: outletID,
      name: reward.name || "",
      cost: reward.cost ?? 0,
      icon: reward.icon || "",
    });
    if (error) throw error;
    return id;
  },

  update: async (
    rewardId: string,
    updates: Partial<Reward>,
    outletID: string = currentOutletID
  ): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.cost !== undefined) patch.cost = updates.cost;
    if (updates.icon !== undefined) patch.icon = updates.icon;
    const { error } = await client()
      .from("rewards")
      .update(patch as never)
      .eq("id", rewardId)
      .eq("outlet_id", outletID);
    if (error) throw error;
  },

  delete: async (rewardId: string, outletID: string = currentOutletID): Promise<void> => {
    if (!hasValidOutlet(outletID)) throw new Error("outletID is required.");
    const { error } = await client()
      .from("rewards")
      .delete()
      .eq("id", rewardId)
      .eq("outlet_id", outletID);
    if (error) throw error;
  },
};

function mapVoucher(row: Record<string, unknown>): Voucher {
  return {
    id: String(row.id),
    outletID: String(row.outlet_id || ""),
    name: String(row.name || ""),
    price: Number(row.price) || 0,
    serviceIds: Array.isArray(row.service_ids) ? (row.service_ids as string[]) : [],
    expiryDate: String(row.expiry_date || ""),
    status: (row.status as VoucherStatus) || "active",
    slug: String(row.slug || ""),
    redemptionId: (row.redemption_id as string) || undefined,
    secretCode: (row.secret_code as string) || undefined,
    purchasedAt: row.purchased_at ? String(row.purchased_at) : undefined,
    redeemedAt: row.redeemed_at ? String(row.redeemed_at) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

const cleanVoucherSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);

async function generateUniqueVoucherSlug(name: string): Promise<string> {
  const base = cleanVoucherSlug(name) || `voucher-${newId().slice(0, 6)}`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${newId().slice(0, 4)}`;
    const { data, error } = await client()
      .from("vouchers")
      .select("id")
      .eq("slug", candidate)
      .limit(1);
    if (error) throw error;
    if (!data?.length) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export const voucherService = {
  create: async (
    input: Omit<Voucher, "id" | "slug" | "status" | "createdAt">
  ): Promise<string> => {
    if (!hasValidOutlet(input.outletID)) throw new Error("outletID is required.");
    const id = newId();
    const slug = await generateUniqueVoucherSlug(input.name);
    const { error } = await client().from("vouchers").insert({
      id,
      outlet_id: input.outletID,
      name: input.name,
      price: Number(input.price) || 0,
      service_ids: input.serviceIds || [],
      expiry_date: input.expiryDate || null,
      slug,
      status: "active",
    });
    if (error) throw error;
    return id;
  },

  getByOutlet: async (outletID: string): Promise<Voucher[]> => {
    if (!hasValidOutlet(outletID)) return [];
    const { data, error } = await client()
      .from("vouchers")
      .select("*")
      .eq("outlet_id", outletID)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => mapVoucher(r as Record<string, unknown>));
  },

  getBySlug: async (slug: string): Promise<Voucher | null> => {
    const { data, error } = await client()
      .from("vouchers")
      .select("*")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapVoucher(data as Record<string, unknown>) : null;
  },

  getByRedemptionId: async (redemptionId: string): Promise<Voucher | null> => {
    const { data, error } = await client()
      .from("vouchers")
      .select("*")
      .eq("redemption_id", redemptionId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapVoucher(data as Record<string, unknown>) : null;
  },

  getById: async (id: string): Promise<Voucher | null> => {
    const { data, error } = await client()
      .from("vouchers")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapVoucher(data as Record<string, unknown>) : null;
  },

  purchase: async (
    voucherId: string
  ): Promise<{ redemptionId: string; secretCode: string }> => {
    const { data, error } = await client().rpc("public_voucher_purchase", {
      p_voucher_id: voucherId,
    });
    if (error) throw error;
    const row = data as { redemptionId?: string; secretCode?: string } | null;
    if (!row?.redemptionId || !row?.secretCode) {
      throw new Error("Purchase did not return redemption details.");
    }
    return { redemptionId: row.redemptionId, secretCode: row.secretCode };
  },

  confirmSoldByCode: async (voucherId: string, inputCode: string): Promise<void> => {
    const existing = await voucherService.getById(voucherId);
    if (!existing) throw new Error("Voucher not found.");
    if (existing.status !== "active") {
      throw new Error("Voucher is already sold or redeemed.");
    }
    const expected = String(existing.secretCode || "");
    if (!expected) throw new Error("No generated secret code found for this voucher.");
    if (expected !== String(inputCode || "").trim()) {
      throw new Error("Secret code is invalid.");
    }
    const { error } = await client()
      .from("vouchers")
      .update({
        status: "sold",
        purchased_at: new Date().toISOString(),
      })
      .eq("id", voucherId);
    if (error) throw error;
  },

  confirmRedemption: async (voucherId: string): Promise<void> => {
    const { error } = await client().rpc("public_voucher_confirm_redemption", {
      p_voucher_id: voucherId,
    });
    if (error) throw error;
  },

  updateStatus: async (id: string, status: VoucherStatus): Promise<void> => {
    const { error } = await client().from("vouchers").update({ status }).eq("id", id);
    if (error) throw error;
  },

  resetVoucher: async (voucherId: string): Promise<void> => {
    const { error } = await client()
      .from("vouchers")
      .update({
        status: "active",
        redemption_id: null,
        secret_code: null,
        purchased_at: null,
        redeemed_at: null,
      })
      .eq("id", voucherId);
    if (error) throw error;
  },
};

export const apiIntegrationService = {
  get: async (outletID: string = currentOutletID): Promise<ApiIntegration | null> => {
    if (!hasValidOutlet(outletID)) return null;
    const { data, error } = await client()
      .from("api_integrations")
      .select("*")
      .eq("outlet_id", outletID)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
      outletID: String(row.outlet_id),
      apiKeyHash: (row.api_key_hash as string) || undefined,
      keyPrefix: (row.key_prefix as string) || undefined,
      webhookUrl: (row.webhook_url as string) || undefined,
      updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    };
  },

  setApiKey: async (
    outletID: string,
    apiKeyHash: string,
    keyPrefix: string,
    effectiveOutletID: string = currentOutletID
  ): Promise<void> => {
    const id = effectiveOutletID || outletID;
    if (!hasValidOutlet(id)) throw new Error("outletID is required.");
    const existing = await apiIntegrationService.get(id);
    const { error } = await client().from("api_integrations").upsert(
      {
        outlet_id: id,
        api_key_hash: apiKeyHash,
        key_prefix: keyPrefix,
        webhook_url: existing?.webhookUrl ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "outlet_id" }
    );
    if (error) throw error;
  },

  setWebhookUrl: async (
    outletID: string,
    webhookUrl: string,
    effectiveOutletID: string = currentOutletID
  ): Promise<void> => {
    const id = effectiveOutletID || outletID;
    if (!hasValidOutlet(id)) throw new Error("outletID is required.");
    const existing = await apiIntegrationService.get(id);
    const { error } = await client().from("api_integrations").upsert(
      {
        outlet_id: id,
        api_key_hash: existing?.apiKeyHash ?? null,
        key_prefix: existing?.keyPrefix ?? null,
        webhook_url: webhookUrl.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "outlet_id" }
    );
    if (error) throw error;
  },
};
