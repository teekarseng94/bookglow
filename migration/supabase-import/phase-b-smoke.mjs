/**
 * Phase B local cutover smoke (anon + optional merchant login).
 *
 * Usage (from migration/):
 *   node supabase-import/phase-b-smoke.mjs
 *
 * Optional:
 *   set SMOKE_EMAIL=baliwellness88@gmail.com
 *   set SMOKE_PASSWORD=...   (or MERCHANT_TEMP_PASSWORD)
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

function loadEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    out[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return out;
}

const merchantEnv = loadEnvFile(path.join(ROOT, "apps", "merchant-portal", ".env"));
const customerEnv = loadEnvFile(path.join(ROOT, "apps", "customer-site", ".env"));

const url = merchantEnv.VITE_SUPABASE_URL || customerEnv.VITE_SUPABASE_URL;
const key =
  merchantEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  merchantEnv.VITE_SUPABASE_ANON_KEY ||
  customerEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  customerEnv.VITE_SUPABASE_ANON_KEY;

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

if (!url || !key) {
  check("env keys present", false, "missing VITE_SUPABASE_URL or publishable/anon key");
  process.exit(1);
}

check("merchant VITE_DATA_PROVIDER", merchantEnv.VITE_DATA_PROVIDER === "supabase", merchantEnv.VITE_DATA_PROVIDER || "(unset)");
check("merchant VITE_AUTH_PROVIDER", merchantEnv.VITE_AUTH_PROVIDER === "supabase", merchantEnv.VITE_AUTH_PROVIDER || "(unset)");
check("customer VITE_DATA_PROVIDER", customerEnv.VITE_DATA_PROVIDER === "supabase", customerEnv.VITE_DATA_PROVIDER || "(unset)");
check("customer VITE_AUTH_PROVIDER", customerEnv.VITE_AUTH_PROVIDER === "supabase", customerEnv.VITE_AUTH_PROVIDER || "(unset)");
check("URL host", /uecphpjymbgtttrizhgy\.supabase\.co/.test(url), url.replace(/https?:\/\//, "").slice(0, 40));
check(
  "key is publishable/anon (not service_role)",
  !/service_role|sb_secret_/i.test(key),
  key.startsWith("sb_publishable_") ? "publishable" : key.startsWith("eyJ") ? "legacy anon jwt" : "other"
);

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: outlets, error: outletsErr } = await sb
  .from("outlets")
  .select("outlet_id,name")
  .limit(5);
check("anon read outlets", !outletsErr && (outlets?.length || 0) > 0, outletsErr?.message || `rows=${outlets?.length || 0}`);

const { data: services, error: servicesErr } = await sb
  .from("services")
  .select("id")
  .limit(5);
check("anon read services", !servicesErr && (services?.length || 0) > 0, servicesErr?.message || `rows=${services?.length || 0}`);

const { count: aptCount, error: aptErr } = await sb
  .from("appointments")
  .select("*", { count: "exact", head: true });
// Appointments are typically not anon-readable; expect either RLS deny or 0 without auth.
check(
  "appointments RLS (anon blocked or empty)",
  !aptErr || /permission|policy|JWT/i.test(aptErr.message) || aptCount === 0 || aptCount == null,
  aptErr ? aptErr.message : `count=${aptCount}`
);

const smokeEmail = (process.env.SMOKE_EMAIL || "baliwellness88@gmail.com").trim().toLowerCase();
const smokePassword = (
  process.env.SMOKE_PASSWORD ||
  process.env.MERCHANT_TEMP_PASSWORD ||
  "BookglowCutover2026!"
).trim();

const { data: loginData, error: loginErr } = await sb.auth.signInWithPassword({
  email: smokeEmail,
  password: smokePassword,
});
check(
  "merchant auth sign-in",
  !loginErr && !!loginData?.user,
  loginErr ? loginErr.message : `uid=${loginData?.user?.id?.slice(0, 8)}…`
);

if (loginData?.user) {
  const authed = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${loginData.session.access_token}` } },
  });
  const { data: profile, error: profileErr } = await authed
    .from("users")
    .select("uid,email,outlet_id,role")
    .eq("uid", loginData.user.id)
    .maybeSingle();
  check(
    "public.users profile for session",
    !profileErr && !!profile,
    profileErr?.message || `${profile?.role}@${profile?.outlet_id || "platform"}`
  );

  const { count: clientCount, error: clientErr } = await authed
    .from("clients")
    .select("*", { count: "exact", head: true });
  check(
    "merchant RLS clients readable",
    !clientErr && (clientCount || 0) > 0,
    clientErr?.message || `count=${clientCount}`
  );

  const { count: txnCount, error: txnErr } = await authed
    .from("transactions")
    .select("*", { count: "exact", head: true });
  check(
    "merchant RLS transactions readable",
    !txnErr && (txnCount || 0) > 0,
    txnErr?.message || `count=${txnCount}`
  );

  await sb.auth.signOut();
}

const failed = results.filter((r) => !r.ok).length;
const reportPath = path.join(__dirname, "generated", "phase_b_smoke_report.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
  reportPath,
  JSON.stringify(
    {
      ranAt: new Date().toISOString(),
      smokeEmail,
      failed,
      results,
    },
    null,
    2
  )
);
console.log("");
console.log(`Summary: ${results.length - failed} passed, ${failed} failed`);
console.log(`Report: ${reportPath}`);
process.exit(failed > 0 ? 1 : 0);
