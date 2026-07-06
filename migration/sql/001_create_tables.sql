-- ============================================================
-- BookGlow: Firestore → Supabase Migration
-- 001_create_tables.sql
-- 
-- Creates all tables matching Firestore collections.
-- Firestore document IDs are preserved as TEXT PRIMARY KEY.
-- Subcollections (pointTransactions, outstandingTransactions,
-- credit_history, points_credits) are flattened into top-level tables.
-- ============================================================

-- Enable UUID generation (used for credit_history default IDs)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. outlets
-- ============================================================
CREATE TABLE IF NOT EXISTS outlets (
  outlet_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address JSONB,
  address_display TEXT,
  phone_number TEXT,
  phone TEXT,
  email TEXT,
  timezone TEXT,
  business_hours JSONB,
  reviews JSONB,
  settings JSONB,
  service_categories JSONB,
  booking_slug TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. users (Firebase Auth UID as PK)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  email TEXT,
  outlet_id TEXT REFERENCES outlets(outlet_id),
  role TEXT DEFAULT 'cashier',
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. clients
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  points INTEGER DEFAULT 0,
  voucher_count INTEGER DEFAULT 0,
  credit NUMERIC(12,2) DEFAULT 0,
  outstanding NUMERIC(12,2) DEFAULT 0,
  birthday TEXT,
  gender TEXT,
  source TEXT,
  ic TEXT,
  marital TEXT,
  tag TEXT,
  ethnic TEXT,
  member_tier TEXT,
  last_import_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. staff
-- ============================================================
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  name TEXT NOT NULL DEFAULT '',
  role TEXT,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  profile_picture TEXT,
  photo_url TEXT,
  qualified_services JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. services
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  name TEXT NOT NULL DEFAULT '',
  price NUMERIC(12,2) DEFAULT 0,
  duration INTEGER DEFAULT 60,
  category TEXT DEFAULT '',
  category_id TEXT,
  points INTEGER DEFAULT 0,
  is_commissionable BOOLEAN DEFAULT false,
  description TEXT,
  image_url TEXT,
  icon_id TEXT,
  display_order INTEGER DEFAULT 0,
  redeem_points_enabled BOOLEAN DEFAULT false,
  redeem_points INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  name TEXT NOT NULL DEFAULT '',
  price NUMERIC(12,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  category TEXT DEFAULT '',
  fixed_commission_amount NUMERIC(12,2)
);

-- ============================================================
-- 7. packages
-- ============================================================
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  name TEXT NOT NULL DEFAULT '',
  price NUMERIC(12,2) DEFAULT 0,
  points INTEGER DEFAULT 0,
  category TEXT DEFAULT '',
  services JSONB,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. appointments
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  client_id TEXT,
  staff_id TEXT,
  service_id TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  end_time TEXT,
  status TEXT DEFAULT 'scheduled',
  reminder_sent BOOLEAN DEFAULT false,
  is_on_duty BOOLEAN DEFAULT false,
  source_sale_id TEXT,
  sale_id TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL,
  client_id TEXT,
  items JSONB,
  amount NUMERIC(12,2) DEFAULT 0,
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  payment_method TEXT,
  parent_sale_id TEXT,
  status TEXT,
  voided BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 10. rewards
-- ============================================================
CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  name TEXT NOT NULL DEFAULT '',
  cost INTEGER DEFAULT 0,
  icon TEXT DEFAULT ''
);

-- ============================================================
-- 11. vouchers
-- ============================================================
CREATE TABLE IF NOT EXISTS vouchers (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  name TEXT NOT NULL DEFAULT '',
  price NUMERIC(12,2) DEFAULT 0,
  service_ids JSONB,
  expiry_date TEXT,
  status TEXT DEFAULT 'active',
  slug TEXT UNIQUE,
  redemption_id TEXT,
  secret_code TEXT,
  purchased_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 12. api_integrations
-- ============================================================
CREATE TABLE IF NOT EXISTS api_integrations (
  outlet_id TEXT PRIMARY KEY REFERENCES outlets(outlet_id),
  api_key_hash TEXT,
  key_prefix TEXT,
  webhook_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 13. point_transactions (flattened from clients/{id}/pointTransactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS point_transactions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  type TEXT NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  previous_balance NUMERIC(12,2) DEFAULT 0,
  new_balance NUMERIC(12,2) DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT now(),
  is_manual BOOLEAN DEFAULT false,
  description TEXT
);

-- ============================================================
-- 14. outstanding_transactions (flattened from clients/{id}/outstandingTransactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS outstanding_transactions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  type TEXT NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  previous_balance NUMERIC(12,2) DEFAULT 0,
  new_balance NUMERIC(12,2) DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT now(),
  is_manual BOOLEAN DEFAULT false,
  description TEXT
);

-- ============================================================
-- 15. credit_history (flattened from clients/{id}/credit_history)
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id TEXT NOT NULL REFERENCES clients(id),
  type TEXT NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  new_balance NUMERIC(12,2) DEFAULT 0,
  staff_remark TEXT,
  staff_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  transaction_id TEXT
);

-- ============================================================
-- 16. points_credits (idempotency log: clients/{id}/points_credits/{saleId})
-- ============================================================
CREATE TABLE IF NOT EXISTS points_credits (
  client_id TEXT NOT NULL REFERENCES clients(id),
  sale_id TEXT NOT NULL,
  points INTEGER NOT NULL,
  credited_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (client_id, sale_id)
);

-- ============================================================
-- 17. frontend_customers (booking portal customer accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS frontend_customers (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  phone TEXT,
  outlet_id TEXT REFERENCES outlets(outlet_id),
  created_at TIMESTAMPTZ DEFAULT now()
);
