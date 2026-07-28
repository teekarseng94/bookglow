/**
 * Controlled import: Firestore staff → Supabase only.
 * Usage: cd migration && node supabase-import/import-staff-only.mjs
 */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const STAFF_COLS = [
  "id",
  "outlet_id",
  "name",
  "role",
  "email",
  "phone",
  "profile_picture",
  "photo_url",
  "qualified_services",
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

function mapStaff(id, data) {
  const d = jsonSafe(data) || {};
  const outletId = d.outletID || d.outletId || d.outlet_id;
  if (!outletId) return null;
  return {
    id,
    outlet_id: String(outletId),
    name: d.name || "",
    role: d.role ?? null,
    email: d.email ?? "",
    phone: d.phone ?? "",
    profile_picture: d.profilePicture ?? d.profile_picture ?? null,
    photo_url: d.photoURL ?? d.photo_url ?? null,
    qualified_services: Array.isArray(d.qualifiedServices)
      ? d.qualifiedServices
      : Array.isArray(d.qualified_services)
        ? d.qualified_services
        : null,
    created_at: toIso(data?.createdAt) || toIso(data?.created_at),
  };
}

function buildUpsertSql(rows) {
  if (rows.length === 0) return "-- staff: no rows\n";
  const colList = STAFF_COLS.join(", ");
  const updates = STAFF_COLS.filter((c) => c !== "id")
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(", ");
  const valueTuples = rows.map((row) => {
    const vals = STAFF_COLS.map((c) => sqlLiteral(row[c] ?? null));
    return `(${vals.join(", ")})`;
  });
  const CHUNK = 40;
  const parts = [];
  for (let i = 0; i < valueTuples.length; i += CHUNK) {
    const slice = valueTuples.slice(i, i + CHUNK);
    parts.push(
      `INSERT INTO staff (${colList})\nVALUES\n${slice.join(",\n")}\nON CONFLICT (id) DO UPDATE SET\n  ${updates};`
    );
  }
  return parts.join("\n\n");
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(GEN_DIR, { recursive: true });

  const outletPath = path.join(DATA_DIR, "outlets.json");
  const outletIds = new Set();
  if (fs.existsSync(outletPath)) {
    for (const o of JSON.parse(fs.readFileSync(outletPath, "utf8"))) {
      outletIds.add(o._id);
    }
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("Exporting staff from Firestore (read-only)...");
  const snap = await getDocs(collection(db, "staff"));
  const raw = snap.docs.map((d) => ({ _id: d.id, ...jsonSafe(d.data()) }));
  fs.writeFileSync(path.join(DATA_DIR, "staff.json"), JSON.stringify(raw, null, 2));

  const mapped = [];
  let skippedNoOutlet = 0;
  let orphaned = 0;
  for (const doc of snap.docs) {
    const row = mapStaff(doc.id, doc.data());
    if (!row) {
      skippedNoOutlet += 1;
      continue;
    }
    if (outletIds.size > 0 && !outletIds.has(row.outlet_id)) {
      orphaned += 1;
      continue;
    }
    mapped.push(row);
  }

  const sql = buildUpsertSql(mapped);
  fs.writeFileSync(path.join(GEN_DIR, "staff_upsert.sql"), sql);
  fs.writeFileSync(
    path.join(GEN_DIR, "staff_summary.json"),
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        staff: mapped.length,
        skippedNoOutlet,
        orphaned,
      },
      null,
      2
    )
  );

  // Also write 10-row batches for MCP apply
  const size = 10;
  for (let i = 0, n = 0; i < mapped.length; i += size, n++) {
    const slice = mapped.slice(i, i + size);
    fs.writeFileSync(
      path.join(GEN_DIR, `staff_${String(n).padStart(2, "0")}.sql`),
      buildUpsertSql(slice)
    );
  }

  console.log(`  staff: ${mapped.length} (skipped missing outlet field: ${skippedNoOutlet}, orphaned: ${orphaned})`);
  console.log("Wrote staff_upsert.sql and staff_XX.sql batches");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
