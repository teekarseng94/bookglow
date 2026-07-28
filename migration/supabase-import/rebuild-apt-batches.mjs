import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "generated");
const files = fs.readdirSync(dir).filter((f) => /^apt_\d+\.sql$/.test(f)).sort();
const BATCH = 5;
const outDir = path.join(dir, "apt_batches");
fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, f));

let bi = 0;
for (let i = 0; i < files.length; i += BATCH) {
  const chunk = files
    .slice(i, i + BATCH)
    .map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
    .join("\n\n");
  fs.writeFileSync(path.join(outDir, `batch_${String(bi).padStart(2, "0")}.sql`), chunk);
  bi += 1;
}

const sql = fs.readFileSync(path.join(dir, "appointments_upsert.sql"), "utf8");
console.log(
  JSON.stringify({
    batches: bi,
    has2400: sql.includes("24:00"),
    has2359: sql.includes("23:59"),
  })
);
