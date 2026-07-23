/**
 * Phase 5 controlled import: Firestore → SQL upserts for remaining merchant data.
 * Requires Admin SDK: migration/firestore-export/serviceAccountKey.json
 *
 * Collections: clients, products, packages, rewards, transactions, vouchers,
 *   users, apiIntegrations (+ optional client ledger subcollections)
 *
 * Usage:
 *   1. Place serviceAccountKey.json
 *   2. cd migration && npm run import:merchant-phase5
 *   3. Apply generated SQL via Supabase SQL editor / MCP
 *      (or: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY && npm run import)
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

function buildUpsertSql(table, cols, rows, pk = "id") {
  if (rows.length === 0) return `-- ${table}: no rows\n`;
  const pkCols = pk.split(",").map((s) => s.trim());
  const updates = cols
    .filter((c) => !pkCols.includes(c))
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(",\n  ");
  const conflict = pkCols.join(", ");
  const CHUNK = 40;
  const parts = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const tuples = slice.map((row) => {
      const vals = cols.map((c) => sqlLiteral(row[c] ?? null));
      return `(${vals.join(", ")})`;
    });
    parts.push(
      `INSERT INTO ${table} (${cols.join(", ")})\nVALUES\n${tuples.join(",\n")}\nON CONFLICT (${conflict}) DO UPDATE SET\n  ${updates};`
    );
  }
  return parts.join("\n\n");
}

function mapClient(id, data) {
  const d = jsonSafe(data) || {};
  const outletId = d.outletID || d.outletId || d.outlet_id;
  if (!outletId) return null;
  return {
    id,
    outlet_id: String(outletId),
    name: d.name || "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    notes: d.notes ?? "",
    points: Number(d.points) || 0,
    voucher_count: Number(d.voucherCount ?? d.voucher_count) || 0,
    credit: Number(d.credit) || 0,
    outstanding: Number(d.outstanding) || 0,
    birthday: d.birthday ?? null,
    gender: d.gender ?? null,
    source: d.source ?? null,
    ic: d.ic ?? null,
    marital: d.marital ?? null,
    tag: d.tag ?? null,
    ethnic: d.ethnic ?? null,
    member_tier: d.memberTier ?? d.member_tier ?? null,
    last_import_id: d.lastImportId ?? d.last_import_id ?? null,
    created_at: toIso(data?.createdAt) || toIso(data?.created_at),
  };
}

function mapProduct(id, data) {
  const d = jsonSafe(data) || {};
  const outletId = d.outletID || d.outletId || d.outlet_id;
  if (!outletId) return null;
  return {
    id,
    outlet_id: String(outletId),
    name: d.name || "",
    price: Number(d.price) || 0,
    stock: Number(d.stock) || 0,
    category: d.category ?? "",
    fixed_commission_amount:
      d.fixedCommissionAmount != null ? Number(d.fixedCommissionAmount) : null,
  };
}

function mapPackage(id, data) {
  const d = jsonSafe(data) || {};
  const outletId = d.outletID || d.outletId || d.outlet_id;
  if (!outletId) return null;
  return {
    id,
    outlet_id: String(outletId),
    name: d.name || "",
    price: Number(d.price) || 0,
    points: Number(d.points) || 0,
    category: d.category ?? "",
    services: Array.isArray(d.services) ? d.services : null,
    description: d.description ?? null,
    created_at: toIso(data?.createdAt) || toIso(data?.created_at),
  };
}

function mapReward(id, data) {
  const d = jsonSafe(data) || {};
  const outletId = d.outletID || d.outletId || d.outlet_id;
  if (!outletId) return null;
  return {
    id,
    outlet_id: String(outletId),
    name: d.name || "",
    cost: Number(d.cost) || 0,
    icon: d.icon ?? "",
  };
}

function mapTransaction(id, data) {
  const d = jsonSafe(data) || {};
  const outletId = d.outletID || d.outletId || d.outlet_id;
  if (!outletId) return null;
  const dateIso = toIso(data?.date) || (typeof d.date === "string" ? d.date : null);
  return {
    id,
    outlet_id: String(outletId),
    date: dateIso || new Date().toISOString(),
    type: d.type || "SALE",
    client_id: d.clientId || d.client_id || null,
    items: Array.isArray(d.items) ? d.items : null,
    amount: Number(d.amount) || 0,
    category: d.category ?? "",
    description: d.description ?? "",
    payment_method: d.paymentMethod || d.payment_method || null,
    parent_sale_id: d.parentSaleId || d.parent_sale_id || null,
    status: d.status ?? null,
    voided: d.voided === true || String(d.status || "").toLowerCase() === "voided",
    remarks: d.remarks ?? null,
    payment_status: d.paymentStatus || d.payment_status || null,
    outstanding: Number(d.outstanding) || 0,
    created_at: toIso(data?.createdAt) || toIso(data?.created_at),
  };
}

function mapVoucher(id, data) {
  const d = jsonSafe(data) || {};
  const outletId = d.outletID || d.outletId || d.outlet_id;
  if (!outletId) return null;
  return {
    id,
    outlet_id: String(outletId),
    name: d.name || "",
    price: Number(d.price) || 0,
    service_ids: Array.isArray(d.serviceIds) ? d.serviceIds : Array.isArray(d.service_ids) ? d.service_ids : [],
    expiry_date: d.expiryDate || d.expiry_date || null,
    status: d.status || "active",
    slug: d.slug || null,
    redemption_id: d.redemptionId || d.redemption_id || null,
    secret_code: d.secretCode || d.secret_code || null,
    purchased_at: toIso(data?.purchasedAt) || toIso(data?.purchased_at),
    redeemed_at: toIso(data?.redeemedAt) || toIso(data?.redeemed_at),
    created_at: toIso(data?.createdAt) || toIso(data?.created_at),
  };
}

function mapUser(id, data) {
  const d = jsonSafe(data) || {};
  return {
    uid: id,
    email: d.email ?? null,
    outlet_id: d.outletId || d.outletID || d.outlet_id || null,
    role: d.role || "cashier",
    display_name: d.displayName || d.display_name || null,
    created_at: toIso(data?.createdAt) || toIso(data?.created_at),
  };
}

function mapApiIntegration(id, data) {
  const d = jsonSafe(data) || {};
  const outletId = id || d.outletID || d.outletId || d.outlet_id;
  if (!outletId) return null;
  return {
    outlet_id: String(outletId),
    api_key_hash: d.apiKeyHash || d.api_key_hash || null,
    key_prefix: d.keyPrefix || d.key_prefix || null,
    webhook_url: d.webhookUrl || d.webhook_url || null,
    updated_at: toIso(data?.updatedAt) || toIso(data?.updated_at) || new Date().toISOString(),
  };
}

async function exportCollection(db, name) {
  const snap = await db.collection(name).get();
  const raw = snap.docs.map((d) => ({ _id: d.id, ...jsonSafe(d.data()) }));
  fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(raw, null, 2));
  return snap.docs;
}

async function exportClientSubcollections(db, clientIds) {
  const pointTxns = [];
  const outstanding = [];
  const creditHistory = [];
  const pointsCredits = [];

  for (const clientId of clientIds) {
    const [pt, ot, ch, pc] = await Promise.all([
      db.collection("clients").doc(clientId).collection("pointTransactions").get(),
      db.collection("clients").doc(clientId).collection("outstandingTransactions").get(),
      db.collection("clients").doc(clientId).collection("credit_history").get(),
      db.collection("clients").doc(clientId).collection("points_credits").get(),
    ]);
    for (const d of pt.docs) {
      const data = jsonSafe(d.data()) || {};
      pointTxns.push({
        id: d.id,
        client_id: clientId,
        outlet_id: data.outletID || data.outlet_id || null,
        type: data.type || "Topup",
        amount: Number(data.amount) || 0,
        previous_balance: Number(data.previousBalance ?? data.previous_balance) || 0,
        new_balance: Number(data.newBalance ?? data.new_balance) || 0,
        timestamp: toIso(d.data()?.timestamp) || new Date().toISOString(),
        is_manual: data.isManual === true || data.is_manual === true,
        description: data.description ?? null,
      });
    }
    for (const d of ot.docs) {
      const data = jsonSafe(d.data()) || {};
      outstanding.push({
        id: d.id,
        client_id: clientId,
        outlet_id: data.outletID || data.outlet_id || null,
        type: data.type || "Add",
        amount: Number(data.amount) || 0,
        previous_balance: Number(data.previousBalance ?? data.previous_balance) || 0,
        new_balance: Number(data.newBalance ?? data.new_balance) || 0,
        timestamp: toIso(d.data()?.timestamp) || new Date().toISOString(),
        is_manual: data.isManual === true || data.is_manual === true,
        description: data.description ?? null,
      });
    }
    for (const d of ch.docs) {
      const data = jsonSafe(d.data()) || {};
      creditHistory.push({
        id: d.id,
        client_id: clientId,
        outlet_id: data.outletID || data.outlet_id || null,
        type: data.type || "topup",
        amount: Number(data.amount) || 0,
        new_balance: Number(data.newBalance ?? data.new_balance) || 0,
        staff_remark: data.staffRemark || data.staff_remark || null,
        staff_name: data.staffName || data.staff_name || null,
        timestamp: toIso(d.data()?.timestamp) || new Date().toISOString(),
        transaction_id: data.transactionId || data.transaction_id || null,
      });
    }
    for (const d of pc.docs) {
      const data = jsonSafe(d.data()) || {};
      pointsCredits.push({
        client_id: clientId,
        sale_id: d.id,
        points: Number(data.points) || 0,
        credited_at: toIso(d.data()?.creditedAt) || toIso(d.data()?.credited_at) || new Date().toISOString(),
      });
    }
  }

  fs.writeFileSync(
    path.join(DATA_DIR, "clients_pointTransactions.json"),
    JSON.stringify(pointTxns.map((r) => ({ _id: r.id, ...r })), null, 2)
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "clients_outstandingTransactions.json"),
    JSON.stringify(outstanding.map((r) => ({ _id: r.id, ...r })), null, 2)
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "clients_credit_history.json"),
    JSON.stringify(creditHistory.map((r) => ({ _id: r.id, ...r })), null, 2)
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "clients_points_credits.json"),
    JSON.stringify(pointsCredits.map((r) => ({ _id: r.sale_id, ...r })), null, 2)
  );

  return { pointTxns, outstanding, creditHistory, pointsCredits };
}

async function main() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error("Missing service account key at:");
    console.error("  ", SERVICE_ACCOUNT_PATH);
    console.error("Firebase Console → Project Settings → Service accounts → Generate new private key");
    console.error("Then re-run: npm run import:merchant-phase5");
    process.exit(1);
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(GEN_DIR, { recursive: true });

  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();

  console.log("Exporting merchant Phase 5 collections from Firestore...");

  const clientsDocs = await exportCollection(db, "clients");
  const productsDocs = await exportCollection(db, "products");
  const packagesDocs = await exportCollection(db, "packages");
  const rewardsDocs = await exportCollection(db, "rewards");
  const transactionsDocs = await exportCollection(db, "transactions");
  const vouchersDocs = await exportCollection(db, "vouchers");
  const usersDocs = await exportCollection(db, "users");
  const apiDocs = await exportCollection(db, "apiIntegrations");

  const clients = clientsDocs.map((d) => mapClient(d.id, d.data())).filter(Boolean);
  const products = productsDocs.map((d) => mapProduct(d.id, d.data())).filter(Boolean);
  const packages = packagesDocs.map((d) => mapPackage(d.id, d.data())).filter(Boolean);
  const rewards = rewardsDocs.map((d) => mapReward(d.id, d.data())).filter(Boolean);
  const transactions = transactionsDocs.map((d) => mapTransaction(d.id, d.data())).filter(Boolean);
  const vouchers = vouchersDocs.map((d) => mapVoucher(d.id, d.data())).filter(Boolean);
  const users = usersDocs.map((d) => mapUser(d.id, d.data())).filter(Boolean);
  const apiIntegrations = apiDocs.map((d) => mapApiIntegration(d.id, d.data())).filter(Boolean);

  console.log("Exporting client ledger subcollections...");
  const ledgers = await exportClientSubcollections(
    db,
    clients.map((c) => c.id)
  );

  // Drop ledger rows missing outlet_id when possible (fill from parent client)
  const clientOutlet = new Map(clients.map((c) => [c.id, c.outlet_id]));
  for (const row of ledgers.pointTxns) {
    if (!row.outlet_id) row.outlet_id = clientOutlet.get(row.client_id) || null;
  }
  for (const row of ledgers.outstanding) {
    if (!row.outlet_id) row.outlet_id = clientOutlet.get(row.client_id) || null;
  }
  const pointTxns = ledgers.pointTxns.filter((r) => r.outlet_id);
  const outstanding = ledgers.outstanding.filter((r) => r.outlet_id);

  const sqlParts = [
    "-- Merchant Phase 5 upsert (generated). Safe to re-run.",
    buildUpsertSql(
      "clients",
      [
        "id",
        "outlet_id",
        "name",
        "email",
        "phone",
        "notes",
        "points",
        "voucher_count",
        "credit",
        "outstanding",
        "birthday",
        "gender",
        "source",
        "ic",
        "marital",
        "tag",
        "ethnic",
        "member_tier",
        "last_import_id",
        "created_at",
      ],
      clients
    ),
    buildUpsertSql(
      "products",
      ["id", "outlet_id", "name", "price", "stock", "category", "fixed_commission_amount"],
      products
    ),
    buildUpsertSql(
      "packages",
      ["id", "outlet_id", "name", "price", "points", "category", "services", "description", "created_at"],
      packages
    ),
    buildUpsertSql("rewards", ["id", "outlet_id", "name", "cost", "icon"], rewards),
    buildUpsertSql(
      "transactions",
      [
        "id",
        "outlet_id",
        "date",
        "type",
        "client_id",
        "items",
        "amount",
        "category",
        "description",
        "payment_method",
        "parent_sale_id",
        "status",
        "voided",
        "remarks",
        "payment_status",
        "outstanding",
        "created_at",
      ],
      transactions
    ),
    buildUpsertSql(
      "vouchers",
      [
        "id",
        "outlet_id",
        "name",
        "price",
        "service_ids",
        "expiry_date",
        "status",
        "slug",
        "redemption_id",
        "secret_code",
        "purchased_at",
        "redeemed_at",
        "created_at",
      ],
      vouchers
    ),
    buildUpsertSql("users", ["uid", "email", "outlet_id", "role", "display_name", "created_at"], users, "uid"),
    buildUpsertSql(
      "api_integrations",
      ["outlet_id", "api_key_hash", "key_prefix", "webhook_url", "updated_at"],
      apiIntegrations,
      "outlet_id"
    ),
    buildUpsertSql(
      "point_transactions",
      [
        "id",
        "client_id",
        "outlet_id",
        "type",
        "amount",
        "previous_balance",
        "new_balance",
        "timestamp",
        "is_manual",
        "description",
      ],
      pointTxns
    ),
    buildUpsertSql(
      "outstanding_transactions",
      [
        "id",
        "client_id",
        "outlet_id",
        "type",
        "amount",
        "previous_balance",
        "new_balance",
        "timestamp",
        "is_manual",
        "description",
      ],
      outstanding
    ),
    buildUpsertSql(
      "credit_history",
      [
        "id",
        "client_id",
        "outlet_id",
        "type",
        "amount",
        "new_balance",
        "staff_remark",
        "staff_name",
        "timestamp",
        "transaction_id",
      ],
      ledgers.creditHistory
    ),
    buildUpsertSql(
      "points_credits",
      ["client_id", "sale_id", "points", "credited_at"],
      ledgers.pointsCredits,
      "client_id, sale_id"
    ),
  ];

  const sqlPath = path.join(GEN_DIR, "merchant_phase5.sql");
  fs.writeFileSync(sqlPath, sqlParts.join("\n\n"));

  const summary = {
    exportedAt: new Date().toISOString(),
    clients: clients.length,
    products: products.length,
    packages: packages.length,
    rewards: rewards.length,
    transactions: transactions.length,
    vouchers: vouchers.length,
    users: users.length,
    apiIntegrations: apiIntegrations.length,
    pointTransactions: pointTxns.length,
    outstandingTransactions: outstanding.length,
    creditHistory: ledgers.creditHistory.length,
    pointsCredits: ledgers.pointsCredits.length,
    sql: "supabase-import/generated/merchant_phase5.sql",
  };
  fs.writeFileSync(path.join(GEN_DIR, "merchant_phase5_summary.json"), JSON.stringify(summary, null, 2));

  console.log("Wrote", sqlPath);
  console.log(JSON.stringify(summary, null, 2));
  console.log("Next: apply merchant_phase5.sql in Supabase SQL editor (or npm run import with service role).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
