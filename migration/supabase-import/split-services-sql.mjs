import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(dir, "generated", "services_upsert.sql"), "utf8");
const header =
  "INSERT INTO services (id, outlet_id, name, price, duration, category, category_id, points, is_commissionable, description, image_url, icon_id, display_order, redeem_points_enabled, redeem_points, is_visible, is_promotion, created_at)";
const conflict = `ON CONFLICT (id) DO UPDATE SET
  outlet_id = EXCLUDED.outlet_id, name = EXCLUDED.name, price = EXCLUDED.price, duration = EXCLUDED.duration, category = EXCLUDED.category, category_id = EXCLUDED.category_id, points = EXCLUDED.points, is_commissionable = EXCLUDED.is_commissionable, description = EXCLUDED.description, image_url = EXCLUDED.image_url, icon_id = EXCLUDED.icon_id, display_order = EXCLUDED.display_order, redeem_points_enabled = EXCLUDED.redeem_points_enabled, redeem_points = EXCLUDED.redeem_points, is_visible = EXCLUDED.is_visible, is_promotion = EXCLUDED.is_promotion, created_at = EXCLUDED.created_at;`;

const start = sql.indexOf("VALUES\n") + "VALUES\n".length;
const end = sql.indexOf("\nON CONFLICT");
const body = sql.slice(start, end);

const rows = [];
let cur = "";
let depth = 0;
let inStr = false;
for (let i = 0; i < body.length; i++) {
  const ch = body[i];
  const prev = body[i - 1];
  if (ch === "'" && prev !== "\\") inStr = !inStr;
  if (!inStr) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
  }
  cur += ch;
  if (!inStr && depth === 0 && cur.trim().endsWith(")")) {
    let j = i + 1;
    while (j < body.length && /[\s,]/.test(body[j])) j++;
    rows.push(cur.trim().replace(/,$/, ""));
    cur = "";
    i = j - 1;
  }
}

console.log("parsed rows", rows.length);
const size = 40;
for (let i = 0, n = 0; i < rows.length; i += size, n++) {
  const chunk = rows.slice(i, i + size).join(",\n");
  const out = `${header}\nVALUES\n${chunk}\n${conflict}`;
  fs.writeFileSync(path.join(dir, "generated", `services_chunk_${n}.sql`), out);
  console.log("chunk", n, "rows", Math.min(size, rows.length - i), "chars", out.length);
}
