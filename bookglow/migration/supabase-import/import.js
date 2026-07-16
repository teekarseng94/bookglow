/**
 * Supabase Import Script
 *
 * Reads exported Firestore JSON files and upserts them into Supabase.
 * Uses the Supabase JS client with service_role key for full access.
 *
 * Usage:
 *   1. Set environment variables:
 *      SUPABASE_URL=https://your-project.supabase.co
 *      SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 *   2. Ensure exported JSON files exist at: migration/firestore-export/data/
 *   3. Run: node migration/supabase-import/import.js
 *
 * Safe to re-run: uses upsert (ON CONFLICT DO UPDATE) for all tables.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ============================================================
// Configuration
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATA_DIR = path.join(__dirname, '..', 'firestore-export', 'data');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables.');
  console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Example:');
  console.error('     set SUPABASE_URL=https://xxxxx.supabase.co');
  console.error('     set SUPABASE_SERVICE_ROLE_KEY=eyJ...');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================
// Field Name Mapping: Firestore camelCase → Supabase snake_case
// ============================================================

const FIELD_MAP = {
  outletID: 'outlet_id',
  clientId: 'client_id',
  staffId: 'staff_id',
  serviceId: 'service_id',
  appointmentId: 'appointment_id',
  transactionId: 'transaction_id',
  voucherId: 'voucher_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  isActive: 'is_active',
  businessHours: 'business_hours',
  addressDisplay: 'address_display',
  phoneNumber: 'phone_number',
  serviceCategories: 'service_categories',
  bookingSlug: 'booking_slug',
  displayName: 'display_name',
  outletId: 'outlet_id',
  voucherCount: 'voucher_count',
  memberTier: 'member_tier',
  lastImportId: 'last_import_id',
  profilePicture: 'profile_picture',
  photoURL: 'photo_url',
  qualifiedServices: 'qualified_services',
  isCommissionable: 'is_commissionable',
  imageUrl: 'image_url',
  categoryId: 'category_id',
  iconId: 'icon_id',
  displayOrder: 'display_order',
  redeemPointsEnabled: 'redeem_points_enabled',
  redeemPoints: 'redeem_points',
  isVisible: 'is_visible',
  fixedCommissionAmount: 'fixed_commission_amount',
  endTime: 'end_time',
  reminderSent: 'reminder_sent',
  isOnDuty: 'is_on_duty',
  sourceSaleId: 'source_sale_id',
  saleId: 'sale_id',
  paymentMethod: 'payment_method',
  parentSaleId: 'parent_sale_id',
  serviceIds: 'service_ids',
  expiryDate: 'expiry_date',
  redemptionId: 'redemption_id',
  secretCode: 'secret_code',
  purchasedAt: 'purchased_at',
  redeemedAt: 'redeemed_at',
  apiKeyHash: 'api_key_hash',
  keyPrefix: 'key_prefix',
  webhookUrl: 'webhook_url',
  previousBalance: 'previous_balance',
  newBalance: 'new_balance',
  isManual: 'is_manual',
  staffRemark: 'staff_remark',
  staffName: 'staff_name',
  creditedAt: 'credited_at',
  _parentClientId: 'client_id',
};

/**
 * Transform a Firestore document to Supabase row format.
 * - Renames _id → id (or outlet_id for outlets)
 * - Converts camelCase field names to snake_case using FIELD_MAP
 * - Passes through unknown fields unchanged
 */
function transformDoc(doc, tableName) {
  const result = {};

  for (const [key, value] of Object.entries(doc)) {
    // Skip internal fields
    if (key === '_id') continue;
    if (key === '_parentClientId') {
      result['client_id'] = value;
      continue;
    }

    // Map field name
    const mappedKey = FIELD_MAP[key] || key;
    result[mappedKey] = value;
  }

  // Set the primary key
  if (tableName === 'outlets') {
    result['outlet_id'] = doc._id;
  } else if (tableName === 'users') {
    result['uid'] = doc._id;
  } else if (tableName === 'points_credits') {
    // Composite PK: client_id + sale_id (sale_id = _id)
    result['sale_id'] = doc._id;
  } else {
    result['id'] = doc._id;
  }

  return result;
}

/**
 * Upsert a batch of rows into a Supabase table.
 * Returns { success: number, failed: number, errors: string[] }
 */
async function upsertBatch(tableName, rows, conflictColumn = 'id') {
  const BATCH_SIZE = 500;
  let success = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    try {
      const { data, error } = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: conflictColumn });

      if (error) {
        failed += batch.length;
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE)}: ${error.message}`);
      } else {
        success += batch.length;
      }
    } catch (err) {
      failed += batch.length;
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE)}: ${err.message}`);
    }
  }

  return { success, failed, errors };
}

// ============================================================
// Import Definitions
// ============================================================

const IMPORT_MAP = [
  // Order matters: outlets first (referenced by everything)
  { file: 'outlets.json', table: 'outlets', pk: 'outlet_id' },
  { file: 'users.json', table: 'users', pk: 'uid' },
  { file: 'clients.json', table: 'clients', pk: 'id' },
  { file: 'staff.json', table: 'staff', pk: 'id' },
  { file: 'services.json', table: 'services', pk: 'id' },
  { file: 'products.json', table: 'products', pk: 'id' },
  { file: 'packages.json', table: 'packages', pk: 'id' },
  { file: 'appointments.json', table: 'appointments', pk: 'id' },
  { file: 'transactions.json', table: 'transactions', pk: 'id' },
  { file: 'rewards.json', table: 'rewards', pk: 'id' },
  { file: 'vouchers.json', table: 'vouchers', pk: 'id' },
  { file: 'apiIntegrations.json', table: 'api_integrations', pk: 'outlet_id' },
  { file: 'frontend_customer.json', table: 'frontend_customers', pk: 'id' },
  // Client subcollections (flattened)
  { file: 'clients_pointTransactions.json', table: 'point_transactions', pk: 'id' },
  { file: 'clients_outstandingTransactions.json', table: 'outstanding_transactions', pk: 'id' },
  { file: 'clients_credit_history.json', table: 'credit_history', pk: 'id' },
  { file: 'clients_points_credits.json', table: 'points_credits', pk: 'client_id,sale_id' },
];

// ============================================================
// Main Import
// ============================================================

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  BookGlow Supabase Import');
  console.log('  Source: migration/firestore-export/data/');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  const summary = [];
  let totalExported = 0;
  let totalImported = 0;
  let totalFailed = 0;

  for (const { file, table, pk } of IMPORT_MAP) {
    const filePath = path.join(DATA_DIR, file);

    if (!fs.existsSync(filePath)) {
      console.log(`  ⏭️  ${file} not found — skipping ${table}`);
      summary.push({ table, exported: 0, imported: 0, failed: 0, status: 'SKIPPED' });
      continue;
    }

    const rawDocs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const rows = rawDocs.map((doc) => transformDoc(doc, table));

    if (rows.length === 0) {
      console.log(`  ⏭️  ${table}: 0 documents — skipping`);
      summary.push({ table, exported: 0, imported: 0, failed: 0, status: 'EMPTY' });
      continue;
    }

    const result = await upsertBatch(table, rows, pk);
    totalExported += rows.length;
    totalImported += result.success;
    totalFailed += result.failed;

    const status = result.failed === 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${table}: ${result.success}/${rows.length} imported`);

    if (result.errors.length > 0) {
      result.errors.forEach((e) => console.log(`      ❌ ${e}`));
    }

    summary.push({
      table,
      exported: rows.length,
      imported: result.success,
      failed: result.failed,
      errors: result.errors,
      status: result.failed === 0 ? 'OK' : 'PARTIAL',
    });
  }

  // Print summary
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Import Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Total exported: ${totalExported}`);
  console.log(`  Total imported: ${totalImported}`);
  console.log(`  Total failed:   ${totalFailed}`);
  console.log('');

  for (const s of summary) {
    const icon = s.status === 'OK' ? '✅' : s.status === 'SKIPPED' ? '⏭️' : s.status === 'EMPTY' ? '⏭️' : '⚠️';
    console.log(`  ${icon} ${s.table.padEnd(28)} ${String(s.imported).padStart(6)} / ${String(s.exported).padStart(6)}  ${s.status}`);
  }

  console.log('');

  if (totalFailed === 0) {
    console.log('  🎉 All data imported successfully!');
  } else {
    console.log(`  ⚠️  ${totalFailed} records failed. Review errors above.`);
    console.log('  Script is safe to re-run (upsert mode).');
  }

  console.log('');
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
