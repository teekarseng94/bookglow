/**
 * Firestore Export Script
 * 
 * Exports all Firestore collections to JSON files for Supabase migration.
 * Uses Firebase Admin SDK. Does NOT modify any Firestore data.
 * 
 * Usage:
 *   1. Place your Firebase service account key JSON at:
 *      migration/firestore-export/serviceAccountKey.json
 *   2. Run: node migration/firestore-export/export.js
 *   3. Output: migration/firestore-export/data/*.json
 * 
 * Each JSON file contains an array of documents with their Firestore document ID
 * preserved as the `_id` field. Timestamps are converted to ISO strings.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ============================================================
// Configuration
// ============================================================

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const OUTPUT_DIR = path.join(__dirname, 'data');

// Top-level collections to export
const COLLECTIONS = [
  'outlets',
  'users',
  'clients',
  'staff',
  'services',
  'products',
  'packages',
  'appointments',
  'transactions',
  'rewards',
  'vouchers',
  'apiIntegrations',
  'frontend_customer',
];

// Subcollections under clients/{clientId}
const CLIENT_SUBCOLLECTIONS = [
  'pointTransactions',
  'outstandingTransactions',
  'credit_history',
  'points_credits',
];

// ============================================================
// Initialize Firebase Admin
// ============================================================

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ Service account key not found at:', SERVICE_ACCOUNT_PATH);
  console.error('');
  console.error('To get your service account key:');
  console.error('  1. Go to Firebase Console → Project Settings → Service accounts');
  console.error('  2. Click "Generate new private key"');
  console.error('  3. Save the JSON file as:');
  console.error('     migration/firestore-export/serviceAccountKey.json');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ============================================================
// Helpers
// ============================================================

/**
 * Convert Firestore value to JSON-safe value.
 * - Timestamps → ISO string
 * - GeoPoints → { lat, lng }
 * - DocumentReferences → path string
 * - Nested objects/arrays are recursively converted.
 */
function convertValue(value) {
  if (value === null || value === undefined) return value;

  // Firestore Timestamp
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString();
  }

  // Firestore GeoPoint
  if (value instanceof admin.firestore.GeoPoint) {
    return { lat: value.latitude, lng: value.longitude };
  }

  // Firestore DocumentReference
  if (value instanceof admin.firestore.DocumentReference) {
    return value.path;
  }

  // Array
  if (Array.isArray(value)) {
    return value.map(convertValue);
  }

  // Object (plain)
  if (typeof value === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = convertValue(val);
    }
    return result;
  }

  return value;
}

/**
 * Export a single collection to a JSON file.
 * Returns the count of documents exported.
 */
async function exportCollection(collectionPath, outputFileName) {
  const snapshot = await db.collection(collectionPath).get();
  const docs = [];

  snapshot.forEach((doc) => {
    const data = convertValue(doc.data());
    docs.push({
      _id: doc.id,
      ...data,
    });
  });

  const outputPath = path.join(OUTPUT_DIR, outputFileName);
  fs.writeFileSync(outputPath, JSON.stringify(docs, null, 2), 'utf-8');
  return docs.length;
}

/**
 * Export all subcollections for all clients.
 * Each subcollection is saved as a flat array with the parent clientId included.
 */
async function exportClientSubcollections() {
  const clientsSnapshot = await db.collection('clients').get();
  const results = {};

  for (const subName of CLIENT_SUBCOLLECTIONS) {
    results[subName] = [];
  }

  let clientIndex = 0;
  const totalClients = clientsSnapshot.size;

  for (const clientDoc of clientsSnapshot.docs) {
    clientIndex++;
    const clientId = clientDoc.id;

    for (const subName of CLIENT_SUBCOLLECTIONS) {
      try {
        const subSnapshot = await db
          .collection('clients')
          .doc(clientId)
          .collection(subName)
          .get();

        subSnapshot.forEach((subDoc) => {
          const data = convertValue(subDoc.data());
          results[subName].push({
            _id: subDoc.id,
            _parentClientId: clientId,
            ...data,
          });
        });
      } catch (err) {
        // Subcollection may not exist for this client — that's fine
      }
    }

    if (clientIndex % 50 === 0 || clientIndex === totalClients) {
      process.stdout.write(`\r  Scanning client subcollections: ${clientIndex}/${totalClients}`);
    }
  }

  console.log(''); // newline after progress

  // Write each subcollection to its own file
  for (const subName of CLIENT_SUBCOLLECTIONS) {
    const outputPath = path.join(OUTPUT_DIR, `clients_${subName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(results[subName], null, 2), 'utf-8');
  }

  return results;
}

// ============================================================
// Main Export
// ============================================================

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  BookGlow Firestore Export');
  console.log('  Target: migration/firestore-export/data/');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const summary = {};

  // Export top-level collections
  for (const collectionName of COLLECTIONS) {
    try {
      const count = await exportCollection(collectionName, `${collectionName}.json`);
      summary[collectionName] = count;
      console.log(`  ✅ ${collectionName}: ${count} documents`);
    } catch (err) {
      summary[collectionName] = `ERROR: ${err.message}`;
      console.error(`  ❌ ${collectionName}: ${err.message}`);
    }
  }

  // Export client subcollections
  console.log('');
  console.log('  Exporting client subcollections...');
  try {
    const subResults = await exportClientSubcollections();
    for (const subName of CLIENT_SUBCOLLECTIONS) {
      const count = subResults[subName].length;
      summary[`clients/${subName}`] = count;
      console.log(`  ✅ clients/${subName}: ${count} documents`);
    }
  } catch (err) {
    console.error(`  ❌ Client subcollections: ${err.message}`);
    for (const subName of CLIENT_SUBCOLLECTIONS) {
      summary[`clients/${subName}`] = `ERROR: ${err.message}`;
    }
  }

  // Write summary
  const summaryPath = path.join(OUTPUT_DIR, '_export_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    exportedAt: new Date().toISOString(),
    collections: summary,
  }, null, 2), 'utf-8');

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Export Summary');
  console.log('═══════════════════════════════════════════════════');
  for (const [name, count] of Object.entries(summary)) {
    console.log(`  ${name}: ${count}`);
  }
  console.log('');
  console.log(`  Summary saved to: ${summaryPath}`);
  console.log('  ✅ Export complete. No Firestore data was modified.');
  console.log('');

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
