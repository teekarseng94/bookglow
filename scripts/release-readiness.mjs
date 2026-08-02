import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const customerFile = process.env.BOOKGLOW_CUSTOMER_ENV || path.join(root, 'apps/customer-site/.env.production');
const merchantFile = process.env.BOOKGLOW_MERCHANT_ENV || path.join(root, 'apps/merchant-portal/.env.production');
const errors = [];

function parseEnv(file) {
  if (!fs.existsSync(file)) {
    errors.push(`Missing environment file: ${path.relative(root, file)}`);
    return {};
  }
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8').split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, '')];
      }),
  );
}

function required(env, key, label) {
  if (!env[key]) errors.push(`${label}: ${key} is required.`);
}

function secureOrigin(env, key, label) {
  const value = env[key];
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') errors.push(`${label}: ${key} must use HTTPS.`);
    if (url.pathname !== '/' || url.search || url.hash) errors.push(`${label}: ${key} must be an origin without a path, query, or hash.`);
    if (['localhost', '127.0.0.1'].includes(url.hostname)) errors.push(`${label}: ${key} cannot point to localhost.`);
  } catch {
    errors.push(`${label}: ${key} must be a valid absolute URL.`);
  }
}

const customer = parseEnv(customerFile);
const merchant = parseEnv(merchantFile);

for (const [env, label] of [[customer, 'customer'], [merchant, 'merchant']]) {
  required(env, 'VITE_SUPABASE_URL', label);
  if (!env.VITE_SUPABASE_PUBLISHABLE_KEY && !env.VITE_SUPABASE_ANON_KEY) {
    errors.push(`${label}: VITE_SUPABASE_PUBLISHABLE_KEY is required.`);
  }
  secureOrigin(env, 'VITE_SUPABASE_URL', label);
  for (const key of Object.keys(env)) {
    if (/SERVICE_ROLE|SECRET_KEY|PRIVATE_KEY/i.test(key)) errors.push(`${label}: ${key} must never be included in a browser environment file.`);
  }
}

required(customer, 'VITE_MERCHANT_PORTAL_URL', 'customer');
required(merchant, 'VITE_CUSTOMER_SITE_URL', 'merchant');
secureOrigin(customer, 'VITE_MERCHANT_PORTAL_URL', 'customer');
secureOrigin(merchant, 'VITE_CUSTOMER_SITE_URL', 'merchant');

for (const key of ['VITE_GOOGLE_AUTH_ENABLED', 'VITE_FACEBOOK_AUTH_ENABLED']) {
  if (customer[key] && !['true', 'false'].includes(customer[key])) errors.push(`customer: ${key} must be true or false.`);
}

if (customer.VITE_SUPABASE_URL && merchant.VITE_SUPABASE_URL && customer.VITE_SUPABASE_URL !== merchant.VITE_SUPABASE_URL) {
  errors.push('Customer and merchant apps must use the same Supabase project.');
}

const requiredFiles = [
  'firebase.json',
  'migration/supabase/migrations/20260802020000_merchant_onboarding.sql',
  'migration/validate/merchant-onboarding-local.mjs',
];
for (const file of requiredFiles) if (!fs.existsSync(path.join(root, file))) errors.push(`Missing release artifact: ${file}`);

if (errors.length) {
  console.error('BookGlow release readiness: BLOCKED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('BookGlow release readiness: PASSED');
console.log('- Browser environment variables are present and production-safe.');
console.log('- Customer and merchant apps target the same Supabase project.');
console.log('- Onboarding migration and validation artifacts are present.');
