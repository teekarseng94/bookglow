import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "firestore-export", "data");
const genDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "generated");

const rows = JSON.parse(fs.readFileSync(path.join(dataDir, "services.json"), "utf8"));
const outletIds = new Set(
  JSON.parse(fs.readFileSync(path.join(dataDir, "outlets.json"), "utf8")).map((o) => o._id)
);

function sqlLit(v) {
  if (v === null || v === undefined) return "NULL";
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
    Number(d.price || 0),
    Number(d.duration || 60),
    d.category || "",
    d.categoryId || null,
    Number(d.points || 0),
    d.isCommissionable === true,
    d.description || "",
    d.imageUrl || null,
    d.iconId || null,
    Number(d.displayOrder || 0),
    d.redeemPointsEnabled === true,
    Number(d.redeemPoints || 0),
    d.isVisible !== false,
    d.isPromotion === true,
    d.createdAt || null,
  ];
}

const mapped = rows.map(map).filter(Boolean);
const header =
  "INSERT INTO services (id, outlet_id, name, price, duration, category, category_id, points, is_commissionable, description, image_url, icon_id, display_order, redeem_points_enabled, redeem_points, is_visible, is_promotion, created_at)";
const conflict =
  "ON CONFLICT (id) DO UPDATE SET outlet_id=EXCLUDED.outlet_id, name=EXCLUDED.name, price=EXCLUDED.price, duration=EXCLUDED.duration, category=EXCLUDED.category, category_id=EXCLUDED.category_id, points=EXCLUDED.points, is_commissionable=EXCLUDED.is_commissionable, description=EXCLUDED.description, image_url=EXCLUDED.image_url, icon_id=EXCLUDED.icon_id, display_order=EXCLUDED.display_order, redeem_points_enabled=EXCLUDED.redeem_points_enabled, redeem_points=EXCLUDED.redeem_points, is_visible=EXCLUDED.is_visible, is_promotion=EXCLUDED.is_promotion, created_at=EXCLUDED.created_at;";

const size = 10;
const files = [];
for (let i = 0, n = 0; i < mapped.length; i += size, n++) {
  const slice = mapped.slice(i, i + size);
  const vals = slice.map((r) => `(${r.map(sqlLit).join(", ")})`).join(",\n");
  const sql = `${header}\nVALUES\n${vals}\n${conflict}`;
  const name = `svc_${String(n).padStart(2, "0")}.sql`;
  fs.writeFileSync(path.join(genDir, name), sql);
  files.push({ name, chars: sql.length, rows: slice.length });
}
fs.writeFileSync(path.join(genDir, "svc_manifest.json"), JSON.stringify({ total: mapped.length, files }, null, 2));
console.log(JSON.stringify({ total: mapped.length, batches: files.length }, null, 2));
