/**
 * Data Validation Script
 *
 * Compares Firestore exported data against Supabase imported data.
 * Checks: row counts, total transaction revenue, total client points,
 * active vouchers, appointment counts, and outlet counts.
 *
 * Usage:
 *   1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 *   2. Ensure Firestore export data exists at: migration/firestore-export/data/
 *   3. Run: node migration/validate/validate.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATA_DIR = path.join(__dirname, '..', 'firestore-export', 'data');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function loadJson(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function getSupabaseCount(table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) return { count: -1, error: error.message };
  return { count };
}

async function getSupabaseSum(table, column) {
  // Supabase JS doesn't support SUM directly; fetch all values
  const { data, error } = await supabase
    .from(table)
    .select(column);
  if (error) return { sum: -1, error: error.message };
  const sum = (data || []).reduce((acc, row) => acc + (Number(row[column]) || 0), 0);
  return { sum };
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  BookGlow Data Validation');
  console.log('  Firestore Export vs Supabase');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  let passed = 0;
  let failed = 0;
  const results = [];

  function check(name, firestoreVal, supabaseVal) {
    const match = firestoreVal === supabaseVal;
    const icon = match ? '✅' : '❌';
    const status = match ? 'PASS' : 'FAIL';
    console.log(`  ${icon} ${name.padEnd(40)} Firestore: ${String(firestoreVal).padStart(8)}  Supabase: ${String(supabaseVal).padStart(8)}  ${status}`);
    results.push({ name, firestore: firestoreVal, supabase: supabaseVal, status });
    if (match) passed++;
    else failed++;
  }

  function checkApprox(name, firestoreVal, supabaseVal, tolerance = 0.01) {
    const match = Math.abs(firestoreVal - supabaseVal) <= tolerance;
    const icon = match ? '✅' : '❌';
    const status = match ? 'PASS' : 'FAIL';
    console.log(`  ${icon} ${name.padEnd(40)} Firestore: ${String(firestoreVal.toFixed(2)).padStart(12)}  Supabase: ${String(supabaseVal.toFixed(2)).padStart(12)}  ${status}`);
    results.push({ name, firestore: firestoreVal, supabase: supabaseVal, status });
    if (match) passed++;
    else failed++;
  }

  // ── Row Count Checks ──────────────────────────────────

  console.log('  ── Row Counts ──────────────────────────────────');

  const countChecks = [
    { file: 'outlets.json', table: 'outlets', label: 'Outlets' },
    { file: 'users.json', table: 'users', label: 'Users' },
    { file: 'clients.json', table: 'clients', label: 'Clients' },
    { file: 'staff.json', table: 'staff', label: 'Staff' },
    { file: 'services.json', table: 'services', label: 'Services' },
    { file: 'products.json', table: 'products', label: 'Products' },
    { file: 'packages.json', table: 'packages', label: 'Packages' },
    { file: 'appointments.json', table: 'appointments', label: 'Appointments' },
    { file: 'transactions.json', table: 'transactions', label: 'Transactions' },
    { file: 'rewards.json', table: 'rewards', label: 'Rewards' },
    { file: 'vouchers.json', table: 'vouchers', label: 'Vouchers' },
    { file: 'apiIntegrations.json', table: 'api_integrations', label: 'API Integrations' },
    { file: 'clients_pointTransactions.json', table: 'point_transactions', label: 'Point Transactions' },
    { file: 'clients_outstandingTransactions.json', table: 'outstanding_transactions', label: 'Outstanding Transactions' },
    { file: 'clients_credit_history.json', table: 'credit_history', label: 'Credit History' },
  ];

  for (const { file, table, label } of countChecks) {
    const docs = loadJson(file);
    const firestoreCount = docs ? docs.length : 0;
    const { count: supabaseCount, error } = await getSupabaseCount(table);
    if (error) {
      console.log(`  ⚠️  ${label.padEnd(40)} Supabase error: ${error}`);
      failed++;
    } else {
      check(`${label} count`, firestoreCount, supabaseCount);
    }
  }

  // ── Business Logic Checks ────────────────────────────

  console.log('');
  console.log('  ── Business Logic ──────────────────────────────');

  // Total transaction revenue (SALE type only, non-voided)
  const txnDocs = loadJson('transactions.json') || [];
  const firestoreRevenue = txnDocs
    .filter(t => t.type === 'SALE' && !t.voided && (t.status || '').toLowerCase() !== 'voided')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const { data: saleRows } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'SALE')
    .neq('voided', true)
    .not('status', 'ilike', 'void%');
  const supabaseRevenue = (saleRows || []).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  checkApprox('Total SALE revenue', firestoreRevenue, supabaseRevenue);

  // Total client points
  const clientDocs = loadJson('clients.json') || [];
  const firestorePoints = clientDocs.reduce((sum, c) => sum + (Number(c.points) || 0), 0);
  const { sum: supabasePoints } = await getSupabaseSum('clients', 'points');
  check('Total client points', firestorePoints, supabasePoints);

  // Active vouchers count
  const voucherDocs = loadJson('vouchers.json') || [];
  const firestoreActiveVouchers = voucherDocs.filter(v => v.status === 'active').length;
  const { count: supabaseActiveVouchers } = await supabase
    .from('vouchers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  check('Active vouchers', firestoreActiveVouchers, supabaseActiveVouchers || 0);

  // Sold vouchers count
  const firestoreSoldVouchers = voucherDocs.filter(v => v.status === 'sold').length;
  const { count: supabaseSoldVouchers } = await supabase
    .from('vouchers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sold');
  check('Sold vouchers', firestoreSoldVouchers, supabaseSoldVouchers || 0);

  // Outlet count
  const outletDocs = loadJson('outlets.json') || [];
  const { count: supabaseOutletCount } = await getSupabaseCount('outlets');
  check('Outlet count', outletDocs.length, supabaseOutletCount);

  // ── Summary ──────────────────────────────────────────

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Validation Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log('');

  if (failed === 0) {
    console.log('  🎉 All validations passed! Data migration is verified.');
  } else {
    console.log('  ⚠️  Some validations failed. Review the details above.');
    console.log('  You may need to re-run the import script or investigate mismatches.');
  }

  console.log('');

  // Save report
  const reportPath = path.join(__dirname, 'validation_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    validatedAt: new Date().toISOString(),
    passed,
    failed,
    checks: results,
  }, null, 2), 'utf-8');
  console.log(`  Report saved to: ${reportPath}`);
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
