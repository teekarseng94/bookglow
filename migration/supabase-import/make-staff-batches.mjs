import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(dir, "..", "firestore-export", "data");
const genDir = path.join(dir, "generated");

const rows = JSON.parse(fs.readFileSync(path.join(dataDir, "staff.json"), "utf8"));
const outletIds = new Set(
  JSON.parse(fs.readFileSync(path.join(dataDir, "outlets.json"), "utf8")).map((o) => o._id)
);

function lit(v) {
  if (v == null) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "object") {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

function map(d) {
  const outlet = d.outletID || d.outletId;
  if (!outlet || !outletIds.has(outlet)) return null;
  return [
    d._id,
    outlet,
    d.name || "",
    d.role || null,
    d.email || "",
    d.phone || "",
    d.profilePicture || null,
    d.photoURL || null,
    Array.isArray(d.qualifiedServices) ? d.qualifiedServices : null,
    d.createdAt || null,
  ];
}

const mapped = rows.map(map).filter(Boolean);
const header =
  "INSERT INTO staff (id, outlet_id, name, role, email, phone, profile_picture, photo_url, qualified_services, created_at)";
const conflict =
  "ON CONFLICT (id) DO UPDATE SET outlet_id=EXCLUDED.outlet_id, name=EXCLUDED.name, role=EXCLUDED.role, email=EXCLUDED.email, phone=EXCLUDED.phone, profile_picture=EXCLUDED.profile_picture, photo_url=EXCLUDED.photo_url, qualified_services=EXCLUDED.qualified_services, created_at=EXCLUDED.created_at;";

const size = 3;
for (let i = 0, n = 0; i < mapped.length; i += size, n++) {
  const slice = mapped.slice(i, i + size);
  const vals = slice.map((r) => `(${r.map(lit).join(", ")})`).join(",\n");
  const sql = `${header}\nVALUES\n${vals}\n${conflict}`;
  fs.writeFileSync(path.join(genDir, `stf_${String(n).padStart(2, "0")}.sql`), sql);
  console.log(`stf_${String(n).padStart(2, "0")}`, slice.length, sql.length);
}
