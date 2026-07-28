/**
 * Controlled import: Firestore appointments → Supabase.
 * Appointments are NOT publicly readable — requires Admin SDK service account
 * unless IMPORT_FROM_JSON=1 (uses existing firestore-export/data/appointments.json).
 *
 * Usage:
 *   1. Place migration/firestore-export/serviceAccountKey.json (live export)
 *      OR set IMPORT_FROM_JSON=1 to reuse the last export
 *   2. Optional: APPOINTMENTS_FULL_HISTORY=1 (default for Phase A) keeps all dates.
 *      Set APPOINTMENTS_FULL_HISTORY=0 to keep only the last 14 days (slot warmup).
 *   3. cd migration && npm run import:appointments
 *   4. Apply generated SQL via MCP / SQL editor / npm run import:appointments:apply
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

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function cutoffDate() {
  // Phase A default: import full history. Opt into 14-day window with APPOINTMENTS_FULL_HISTORY=0
  // or --recent-only.
  if (hasFlag("--recent-only")) {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  }
  const full =
    hasFlag("--full-history") ||
    process.env.APPOINTMENTS_FULL_HISTORY == null ||
    process.env.APPOINTMENTS_FULL_HISTORY === "1" ||
    process.env.APPOINTMENTS_FULL_HISTORY === "true";
  if (full) return null;
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toISOString().slice(0, 10);
}

function sanitizeTime(value) {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  const m = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return raw.slice(0, 8);
  let hh = Number(m[1]);
  let mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return "00:00";
  // Firestore occasionally stores 24:00; Postgres TIME rejects it.
  if (hh === 24 && mm === 0) return "23:59";
  if (hh > 23) hh = 23;
  if (mm > 59) mm = 59;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
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
    time: sanitizeTime(d.time) || "00:00",
    end_time: sanitizeTime(d.endTime || d.end_time),
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

async function loadDocsFromFirestore() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error("Missing service account:", SERVICE_ACCOUNT_PATH);
    console.error("Appointments are staff-only in Firestore rules; client SDK cannot export them.");
    console.error("Add serviceAccountKey.json then re-run: npm run import:appointments");
    console.error("Or set IMPORT_FROM_JSON=1 to reuse firestore-export/data/appointments.json");
    process.exit(1);
  }
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();
  console.log("Exporting appointments via Admin SDK...");
  const snap = await db.collection("appointments").get();
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
}

function loadDocsFromJson() {
  const filePath = path.join(DATA_DIR, "appointments.json");
  if (!fs.existsSync(filePath)) {
    console.error("Missing", filePath);
    process.exit(1);
  }
  console.log("Loading appointments from JSON export...");
  const rows = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return rows.map((row) => {
    const { _id, ...data } = row;
    return { id: _id, data };
  });
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(GEN_DIR, { recursive: true });
  const minDate = cutoffDate();
  const fromJson =
    hasFlag("--from-json") ||
    process.env.IMPORT_FROM_JSON === "1" ||
    process.env.IMPORT_FROM_JSON === "true";

  const outletPath = path.join(DATA_DIR, "outlets.json");
  const outletIds = new Set();
  if (fs.existsSync(outletPath)) {
    for (const o of JSON.parse(fs.readFileSync(outletPath, "utf8"))) {
      outletIds.add(o._id);
    }
  }

  const docs = fromJson ? loadDocsFromJson() : await loadDocsFromFirestore();
  console.log(
    minDate
      ? `Filtering appointments date >= ${minDate}...`
      : "Keeping full appointment history (no date cutoff)..."
  );

  const raw = [];
  const mapped = [];
  let skippedOld = 0;
  let skippedBad = 0;
  let orphaned = 0;

  for (const { id, data } of docs) {
    const safe = { _id: id, ...jsonSafe(data) };
    raw.push(safe);
    const row = mapApt(id, data);
    if (!row) {
      skippedBad += 1;
      continue;
    }
    if (minDate && row.date < minDate) {
      skippedOld += 1;
      continue;
    }
    if (outletIds.size && !outletIds.has(row.outlet_id)) {
      orphaned += 1;
      continue;
    }
    mapped.push(row);
  }

  if (!fromJson) {
    fs.writeFileSync(path.join(DATA_DIR, "appointments.json"), JSON.stringify(raw, null, 2));
  }
  fs.writeFileSync(path.join(GEN_DIR, "appointments_upsert.sql"), buildUpsert(mapped));

  // Clear previous apt_*.sql chunks so stale short-window files are not applied.
  for (const name of fs.readdirSync(GEN_DIR)) {
    if (/^apt_\d+\.sql$/.test(name)) fs.unlinkSync(path.join(GEN_DIR, name));
  }

  const size = 40;
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
        minDate: minDate || "all",
        source: fromJson ? "json" : "firestore",
        totalFirestore: docs.length,
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
    `  kept ${mapped.length} / ${docs.length} (old ${skippedOld}, bad ${skippedBad}, orphan ${orphaned})`
  );
  console.log(`  wrote ${Math.ceil(mapped.length / size)} chunk file(s) under supabase-import/generated/apt_*.sql`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
