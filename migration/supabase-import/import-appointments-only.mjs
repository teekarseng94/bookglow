/**
 * Controlled import: Firestore appointments → Supabase (for slot calculation).
 * Appointments are NOT publicly readable — requires Admin SDK service account.
 *
 * Usage:
 *   1. Place migration/firestore-export/serviceAccountKey.json
 *   2. cd migration && npm run import:appointments
 *   3. Apply generated SQL via MCP / SQL editor
 */
import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "firestore-export", "data");
const GEN_DIR = path.join(__dirname, "generated");
const SERVICE_ACCOUNT_PATH = path.join(ROOT, "firestore-export", "serviceAccountKey.json");

const COLS = [
  "id",
  "outlet_id",
  "client_id",
  "staff_id",
  "service_id",
  "date",
  "time",
  "end_time",
  "status",
  "reminder_sent",
  "is_on_duty",
  "source_sale_id",
  "sale_id",
  "source",
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
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function cutoffDate() {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toISOString().slice(0, 10);
}

function mapApt(id, data) {
  const d = jsonSafe(data) || {};
  const outletId = d.outletID || d.outletId || d.outlet_id;
  if (!outletId) return null;
  const date = d.date ? String(d.date).slice(0, 10) : null;
  if (!date) return null;
  return {
    id,
    outlet_id: String(outletId),
    client_id: d.clientId || d.client_id || d.customerId || null,
    staff_id: d.staffId || d.staff_id || null,
    service_id: d.serviceId || d.service_id || null,
    date,
    time: d.time || "00:00",
    end_time: d.endTime || d.end_time || null,
    status: d.status || "scheduled",
    reminder_sent: d.reminderSent === true,
    is_on_duty: d.isOnDuty === true,
    source_sale_id: d.sourceSaleId || d.source_sale_id || null,
    sale_id: d.saleId || d.sale_id || null,
    source: d.source || null,
    created_at: toIso(data?.createdAt) || toIso(data?.created_at),
  };
}

function buildUpsert(rows) {
  if (!rows.length) return "-- appointments: no rows\n";
  const updates = COLS.filter((c) => c !== "id")
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(", ");
  const header = `INSERT INTO appointments (${COLS.join(", ")})`;
  const conflict = `ON CONFLICT (id) DO UPDATE SET\n  ${updates};`;
  const CHUNK = 40;
  const parts = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const vals = slice
      .map((row) => `(${COLS.map((c) => sqlLiteral(row[c] ?? null)).join(", ")})`)
      .join(",\n");
    parts.push(`${header}\nVALUES\n${vals}\n${conflict}`);
  }
  return parts.join("\n\n");
}

async function main() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error("Missing service account:", SERVICE_ACCOUNT_PATH);
    console.error("Appointments are staff-only in Firestore rules; client SDK cannot export them.");
    console.error("Add serviceAccountKey.json then re-run: npm run import:appointments");
    process.exit(1);
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(GEN_DIR, { recursive: true });
  const minDate = cutoffDate();

  const outletPath = path.join(DATA_DIR, "outlets.json");
  const outletIds = new Set();
  if (fs.existsSync(outletPath)) {
    for (const o of JSON.parse(fs.readFileSync(outletPath, "utf8"))) {
      outletIds.add(o._id);
    }
  }

  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();

  console.log(`Exporting appointments via Admin SDK (date >= ${minDate})...`);
  const snap = await db.collection("appointments").get();
  const raw = [];
  const mapped = [];
  let skippedOld = 0;
  let skippedBad = 0;
  let orphaned = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const safe = { _id: doc.id, ...jsonSafe(data) };
    raw.push(safe);
    const row = mapApt(doc.id, data);
    if (!row) {
      skippedBad += 1;
      continue;
    }
    if (row.date < minDate) {
      skippedOld += 1;
      continue;
    }
    if (outletIds.size && !outletIds.has(row.outlet_id)) {
      orphaned += 1;
      continue;
    }
    mapped.push(row);
  }

  fs.writeFileSync(path.join(DATA_DIR, "appointments.json"), JSON.stringify(raw, null, 2));
  fs.writeFileSync(path.join(GEN_DIR, "appointments_upsert.sql"), buildUpsert(mapped));

  const size = 25;
  for (let i = 0, n = 0; i < mapped.length; i += size, n++) {
    fs.writeFileSync(
      path.join(GEN_DIR, `apt_${String(n).padStart(2, "0")}.sql`),
      buildUpsert(mapped.slice(i, i + size))
    );
  }

  fs.writeFileSync(
    path.join(GEN_DIR, "appointments_summary.json"),
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        minDate,
        totalFirestore: snap.size,
        imported: mapped.length,
        skippedOld,
        skippedBad,
        orphaned,
      },
      null,
      2
    )
  );

  console.log(
    `  kept ${mapped.length} / ${snap.size} (old ${skippedOld}, bad ${skippedBad}, orphan ${orphaned})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
