/**
 * Map Firebase merchant accounts → Supabase Auth + public.users.
 *
 * Requires:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   Optional: MERCHANT_TEMP_PASSWORD (default BookglowCutover2026!)
 *
 * Reads: supabase-import/generated/firebase_merchant_auth.json
 *        (from Firebase Admin getUser for portal staff)
 *
 * Usage:
 *   cd migration
 *   set SUPABASE_URL=https://uecphpjymbgtttrizhgy.supabase.co
 *   set SUPABASE_SERVICE_ROLE_KEY=...
 *   npm run map:merchant-auth
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const GEN = path.join(__dirname, "generated");

const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SERVICE_ROLE = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const TEMP_PASSWORD =
  (process.env.MERCHANT_TEMP_PASSWORD || "BookglowCutover2026!").trim();

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const firebaseMerchantsPath = path.join(GEN, "firebase_merchant_auth.json");
if (!fs.existsSync(firebaseMerchantsPath)) {
  console.error("Missing", firebaseMerchantsPath);
  console.error("Export Firebase Auth emails for merchant UIDs first.");
  process.exit(1);
}

/** @type {{ uid: string, email: string | null, displayName?: string | null, error?: string }[]} */
const firebaseMerchants = JSON.parse(fs.readFileSync(firebaseMerchantsPath, "utf8"));

/** Firestore public.users role/outlet by old Firebase uid */
const portalByFirebaseUid = {
  "6YdQ1rbYDihtXd6zzGgKpTlyyhr2": { outlet_id: "outlet_003", role: "admin" },
  NUG6zzYwxXcDdGsH1YuBGHOwfqq2: { outlet_id: "outlet_002", role: "admin" },
  RE582vg4LHWrlVbft4rRfjSZ7Ld2: { outlet_id: "outlet_001", role: "cashier" },
  ahzLxDIf0VdoSIO2OHNo2vaeg513: { outlet_id: "outlet_001", role: "admin" },
  dHEpR8cYSnPr652sdB14fjsyH1w1: { outlet_id: "outlet_001", role: "cashier" },
  kNpGbmRDr3hIy8lJAzTKrTILVun1: { outlet_id: "outlet_002", role: "admin" },
  qcSPdUz54xenyDnfH3doDdi3vsU2: { outlet_id: "outlet_002", role: "cashier" },
};

const OWNER_EMAIL = "teekarseng94@gmail.com";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureAuthUser(email, displayName) {
  const normalized = email.trim().toLowerCase();
  const { data: listed, error: listErr } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw listErr;
  const existing = listed.users.find((u) => (u.email || "").toLowerCase() === normalized);
  if (existing) return existing;

  const { data, error } = await sb.auth.admin.createUser({
    email: normalized,
    password: TEMP_PASSWORD,
    email_confirm: true,
    user_metadata: displayName ? { full_name: displayName } : undefined,
  });
  if (error) throw error;
  return data.user;
}

async function upsertPortalRow({ uid, email, outlet_id, role, display_name }) {
  // Remove stale Firebase-uid rows for same outlet+role email if present
  const { error } = await sb.from("users").upsert(
    {
      uid,
      email,
      outlet_id,
      role,
      display_name: display_name || null,
    },
    { onConflict: "uid" }
  );
  if (error) throw error;
}

async function main() {
  const results = [];

  // Platform owner (UserContext hard-bypass + optional users row)
  const owner = await ensureAuthUser(OWNER_EMAIL, "Owner");
  await upsertPortalRow({
    uid: owner.id,
    email: OWNER_EMAIL,
    outlet_id: null,
    role: "platform_admin",
    display_name: "Owner",
  });
  results.push({
    email: OWNER_EMAIL,
    supabaseUid: owner.id,
    role: "platform_admin",
    outlet_id: null,
    status: "ok",
  });

  for (const m of firebaseMerchants) {
    const meta = portalByFirebaseUid[m.uid];
    if (!meta) continue;
    if (!m.email) {
      results.push({
        firebaseUid: m.uid,
        status: "skipped",
        reason: m.error || "no email in Firebase Auth",
      });
      continue;
    }
    try {
      const user = await ensureAuthUser(m.email, m.displayName || null);
      await upsertPortalRow({
        uid: user.id,
        email: m.email.toLowerCase(),
        outlet_id: meta.outlet_id,
        role: meta.role,
        display_name: m.displayName || null,
      });
      // Delete obsolete Firebase-uid mapping row (optional cleanup)
      await sb.from("users").delete().eq("uid", m.uid);
      results.push({
        email: m.email.toLowerCase(),
        firebaseUid: m.uid,
        supabaseUid: user.id,
        role: meta.role,
        outlet_id: meta.outlet_id,
        status: "ok",
      });
    } catch (e) {
      results.push({
        email: m.email,
        firebaseUid: m.uid,
        status: "error",
        error: e.message || String(e),
      });
    }
  }

  const outPath = path.join(GEN, "merchant_auth_map.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        mappedAt: new Date().toISOString(),
        tempPasswordHint: "MERCHANT_TEMP_PASSWORD or default BookglowCutover2026!",
        results,
      },
      null,
      2
    )
  );

  console.log(JSON.stringify(results, null, 2));
  console.log("Wrote", outPath);
  console.log("Temp password used for NEW auth users (change after login).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
