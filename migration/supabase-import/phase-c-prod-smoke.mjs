/**
 * Phase C post-deploy smoke: live hosting bundles + anon API.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

function loadEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > 0) out[t.slice(0, i)] = t.slice(i + 1);
  }
  return out;
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const sites = [
  ["booking hosting", "https://bookglow-83fb3.web.app"],
  ["dashboard hosting", "https://bookglow-83fb3-dashboard.web.app"],
];

async function collectJsGraph(baseUrl, entryUrls, limit = 80) {
  const seen = new Set();
  const queue = [...entryUrls];
  while (queue.length && seen.size < limit) {
    const jsUrl = queue.shift();
    if (!jsUrl || seen.has(jsUrl)) continue;
    seen.add(jsUrl);
    const text = await (await fetch(jsUrl)).text();
    for (const m of text.matchAll(/(?:assets\/)?([A-Za-z0-9._-]+\.js)/g)) {
      const rel = m[0].includes("assets/") ? m[0] : `assets/${m[1]}`;
      queue.push(new URL(rel, baseUrl).href);
    }
  }
  return seen;
}

for (const [name, url] of sites) {
  const htmlRes = await fetch(url, { redirect: "follow" });
  const html = await htmlRes.text();
  check(`${name} HTTP`, htmlRes.ok, `status=${htmlRes.status}`);
  const entry = [...html.matchAll(/assets\/[^"']+\.js/g)].map((m) => new URL(m[0], url).href);
  const graph = await collectJsGraph(url, entry);
  let hasUrl = false;
  let hasPub = false;
  for (const jsUrl of graph) {
    const js = await (await fetch(jsUrl)).text();
    if (js.includes("uecphpjymbgtttrizhgy.supabase.co")) hasUrl = true;
    if (js.includes("sb_publishable_")) hasPub = true;
  }
  check(`${name} bundle has Supabase URL`, hasUrl, `assets=${graph.size}`);
  check(`${name} bundle has publishable key`, hasPub);
}

const env = loadEnv(path.join(ROOT, "apps", "merchant-portal", ".env.production"));
const sb = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY
);
const { data: outlets, error: outletsErr } = await sb.from("outlets").select("outlet_id").limit(5);
check("anon outlets API", !outletsErr && (outlets?.length || 0) > 0, outletsErr?.message || `rows=${outlets?.length || 0}`);

const smokeEmail = (process.env.SMOKE_EMAIL || "baliwellness88@gmail.com").trim().toLowerCase();
const smokePassword = (
  process.env.SMOKE_PASSWORD ||
  process.env.MERCHANT_TEMP_PASSWORD ||
  "admin123"
).trim();
const { data: loginData, error: loginErr } = await sb.auth.signInWithPassword({
  email: smokeEmail,
  password: smokePassword,
});
check("merchant auth still works", !loginErr && !!loginData?.user, loginErr?.message || "ok");
if (loginData?.session) {
  const authed = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${loginData.session.access_token}` } },
  });
  const { count, error } = await authed.from("clients").select("*", { count: "exact", head: true });
  check("merchant RLS clients", !error && (count || 0) > 0, error?.message || `count=${count}`);
  await sb.auth.signOut();
}

const failed = results.filter((r) => !r.ok).length;
const reportPath = path.join(__dirname, "generated", "phase_c_smoke_report.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
  reportPath,
  JSON.stringify({ ranAt: new Date().toISOString(), failed, results }, null, 2)
);
console.log("");
console.log(`Summary: ${results.length - failed} passed, ${failed} failed`);
console.log(`Report: ${reportPath}`);
process.exit(failed > 0 ? 1 : 0);
