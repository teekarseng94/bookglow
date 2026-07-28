/**
 * Controlled import: Firestore outlets + services → Supabase only.
 * Read-only on Firestore (public rules). Writes only to Supabase via generated SQL
 * (applied separately through MCP execute_sql) or optional service_role upsert.
 *
 * Usage:
 *   cd migration && npm install
 *   node supabase-import/import-outlets-services-only.mjs
 *
 * Outputs:
 *   firestore-export/data/outlets.json
 *   firestore-export/data/services.json
 *   supabase-import/generated/outlets_upsert.sql
 *   supabase-import/generated/services_upsert.sql
 */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "firestore-export", "data");
const GEN_DIR = path.join(__dirname, "generated");

const firebaseConfig = {
  apiKey: "AIzaSyDZ2mARLr07WyhCcKGljEZZi7S6nvBdpbQ",
  authDomain: "bookglow-83fb3.firebaseapp.com",
  projectId: "bookglow-83fb3",
  storageBucket: "bookglow-83fb3.firebasestorage.app",
  messagingSenderId: "27124152215",
  appId: "1:27124152215:web:669828b79c302697c136d2",
};

const OUTLET_COLS = [
  "outlet_id",
  "name",
  "address",
  "address_display",
  "phone_number",
  "phone",
  "email",
  "timezone",
  "business_hours",
  "reviews",
  "settings",
  "service_categories",
  "booking_slug",
  "is_active",
  "created_at",
  "updated_at",
];

const SERVICE_COLS = [
  "id",
  "outlet_id",
  "name",
  "price",
  "duration",
  "category",
  "category_id",
  "points",
  "is_commissionable",
  "description",
  "image_url",
  "icon_id",
  "display_order",
  "redeem_points_enabled",
  "redeem_points",
  "is_visible",
  "is_promotion",
  "created_at",
];

function toIso(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (typeof value?.seconds === "number") {
    return new Date(value.seconds * 1000).toISOString();
  }
  return null;
}

function jsonSafe(value) {
  if (value == null) return null;
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (typeof value?.seconds === "number" && value.nanoseconds != null) {
    return new Date(value.seconds * 1000).toISOString();
  }
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = jsonSafe(v);
    return out;
  }
  return value;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "object") {
    const json = JSON.stringify(value).replace(/'/g, "''");
    return `'${json}'::jsonb`;
  }
  const s = String(value).replace(/'/g, "''");
  return `'${s}'`;
}

function mapOutlet(id, data) {
  const d = jsonSafe(data) || {};
  return {
    outlet_id: id,
    name: d.name || id,
    address: d.address ?? null,
    address_display: d.addressDisplay ?? null,
    phone_number: d.phoneNumber ?? null,
    phone: d.phone ?? null,
    email: d.email ?? null,
    timezone: d.timezone ?? null,
    business_hours: d.businessHours ?? null,
    reviews: d.reviews ?? null,
    settings: d.settings ?? null,
    service_categories: d.serviceCategories ?? null,
    booking_slug:
      typeof d.bookingSlug === "string" && d.bookingSlug.trim()
        ? d.bookingSlug.trim()
        : null,
    is_active: d.isActive !== false,
    created_at: toIso(data?.createdAt) || toIso(data?.created_at),
    updated_at: toIso(data?.updatedAt) || toIso(data?.updated_at),
  };
}

function mapService(id, data) {
  const d = jsonSafe(data) || {};
  const outletId = d.outletID || d.outletId || d.outlet_id;
  if (!outletId) return null;
  return {
    id,
    outlet_id: String(outletId),
    name: d.name || "",
    price: Number(d.price ?? 0),
    duration: Number(d.duration ?? 60),
    category: d.category || "",
    category_id: d.categoryId ?? d.category_id ?? null,
    points: Number(d.points ?? 0),
    is_commissionable: d.isCommissionable === true,
    description: d.description ?? null,
    image_url: d.imageUrl ?? d.image_url ?? null,
    icon_id: d.iconId ?? d.icon_id ?? null,
    display_order: Number(d.displayOrder ?? d.display_order ?? 0),
    redeem_points_enabled: d.redeemPointsEnabled === true,
    redeem_points: Number(d.redeemPoints ?? d.redeem_points ?? 0),
    is_visible: d.isVisible !== false,
    is_promotion: d.isPromotion === true,
    created_at: toIso(data?.createdAt) || toIso(data?.created_at),
  };
}

function buildUpsertSql(table, pk, cols, rows) {
  if (rows.length === 0) return `-- ${table}: no rows\n`;
  const colList = cols.join(", ");
  const updates = cols
    .filter((c) => c !== pk)
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(", ");

  const valueTuples = rows.map((row) => {
    const vals = cols.map((c) => sqlLiteral(row[c] ?? null));
    return `(${vals.join(", ")})`;
  });

  // Batch into chunks of 100 for safer MCP apply
  const CHUNK = 100;
  const parts = [];
  for (let i = 0; i < valueTuples.length; i += CHUNK) {
    const slice = valueTuples.slice(i, i + CHUNK);
    parts.push(
      `INSERT INTO ${table} (${colList})\nVALUES\n${slice.join(",\n")}\nON CONFLICT (${pk}) DO UPDATE SET\n  ${updates};`
    );
  }
  return parts.join("\n\n");
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(GEN_DIR, { recursive: true });

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("Exporting outlets from Firestore (read-only)...");
  const outletSnap = await getDocs(collection(db, "outlets"));
  const outlets = [];
  for (const doc of outletSnap.docs) {
    outlets.push(mapOutlet(doc.id, doc.data()));
  }
  fs.writeFileSync(
    path.join(DATA_DIR, "outlets.json"),
    JSON.stringify(
      outletSnap.docs.map((d) => ({ _id: d.id, ...jsonSafe(d.data()) })),
      null,
      2
    )
  );
  console.log(`  outlets: ${outlets.length}`);

  console.log("Exporting services from Firestore (read-only)...");
  const serviceSnap = await getDocs(collection(db, "services"));
  const services = [];
  let skippedNoOutlet = 0;
  for (const doc of serviceSnap.docs) {
    const row = mapService(doc.id, doc.data());
    if (!row) {
      skippedNoOutlet += 1;
      continue;
    }
    services.push(row);
  }
  fs.writeFileSync(
    path.join(DATA_DIR, "services.json"),
    JSON.stringify(
      serviceSnap.docs.map((d) => ({ _id: d.id, ...jsonSafe(d.data()) })),
      null,
      2
    )
  );
  console.log(`  services: ${services.length} (skipped missing outlet: ${skippedNoOutlet})`);

  // Drop services whose outlet was not exported
  const outletIds = new Set(outlets.map((o) => o.outlet_id));
  const servicesOk = services.filter((s) => outletIds.has(s.outlet_id));
  const orphaned = services.length - servicesOk.length;
  if (orphaned) console.log(`  services orphaned (no outlet row): ${orphaned}`);

  const outletsSql = buildUpsertSql("outlets", "outlet_id", OUTLET_COLS, outlets);
  const servicesSql = buildUpsertSql("services", "id", SERVICE_COLS, servicesOk);
  fs.writeFileSync(path.join(GEN_DIR, "outlets_upsert.sql"), outletsSql);
  fs.writeFileSync(path.join(GEN_DIR, "services_upsert.sql"), servicesSql);
  fs.writeFileSync(
    path.join(GEN_DIR, "summary.json"),
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        outlets: outlets.length,
        services: servicesOk.length,
        servicesSkippedNoOutlet: skippedNoOutlet,
        servicesOrphaned: orphaned,
      },
      null,
      2
    )
  );

  console.log("");
  console.log("Wrote:");
  console.log("  firestore-export/data/outlets.json");
  console.log("  firestore-export/data/services.json");
  console.log("  supabase-import/generated/outlets_upsert.sql");
  console.log("  supabase-import/generated/services_upsert.sql");
  console.log("  supabase-import/generated/summary.json");

  // Optional: upsert via service role if env present
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const { createClient } = require("@supabase/supabase-js");
    const sb = createClient(url, key);
    const { error: oErr } = await sb.from("outlets").upsert(outlets, {
      onConflict: "outlet_id",
    });
    if (oErr) throw oErr;
    const { error: sErr } = await sb.from("services").upsert(servicesOk, {
      onConflict: "id",
    });
    if (sErr) throw sErr;
    console.log("Upserted via SUPABASE_SERVICE_ROLE_KEY.");
  } else {
    console.log("");
    console.log("No SUPABASE_SERVICE_ROLE_KEY — apply generated SQL via MCP/SQL editor.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
