-- ============================================================
-- BookGlow: Firestore → Supabase Migration
-- 002_create_indexes.sql
--
-- Performance indexes matching Firestore composite indexes.
-- All multi-tenant queries filter by outlet_id first.
-- ============================================================

-- Clients
CREATE INDEX IF NOT EXISTS idx_clients_outlet ON clients(outlet_id);
CREATE INDEX IF NOT EXISTS idx_clients_outlet_created ON clients(outlet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_outlet_email ON clients(outlet_id, email);
CREATE INDEX IF NOT EXISTS idx_clients_outlet_phone ON clients(outlet_id, phone);
CREATE INDEX IF NOT EXISTS idx_clients_outlet_points ON clients(outlet_id, points DESC);
CREATE INDEX IF NOT EXISTS idx_clients_last_import ON clients(outlet_id, last_import_id);

-- Staff
CREATE INDEX IF NOT EXISTS idx_staff_outlet ON staff(outlet_id);
CREATE INDEX IF NOT EXISTS idx_staff_outlet_created ON staff(outlet_id, created_at DESC);

-- Services
CREATE INDEX IF NOT EXISTS idx_services_outlet ON services(outlet_id);
CREATE INDEX IF NOT EXISTS idx_services_outlet_category ON services(outlet_id, category);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_outlet ON products(outlet_id);
CREATE INDEX IF NOT EXISTS idx_products_outlet_category ON products(outlet_id, category);

-- Packages
CREATE INDEX IF NOT EXISTS idx_packages_outlet ON packages(outlet_id);
CREATE INDEX IF NOT EXISTS idx_packages_outlet_name ON packages(outlet_id, name);

-- Rewards
CREATE INDEX IF NOT EXISTS idx_rewards_outlet ON rewards(outlet_id);
CREATE INDEX IF NOT EXISTS idx_rewards_outlet_cost ON rewards(outlet_id, cost);

-- Appointments (most critical for calendar, schedule, booking)
CREATE INDEX IF NOT EXISTS idx_appointments_outlet ON appointments(outlet_id);
CREATE INDEX IF NOT EXISTS idx_appointments_outlet_date ON appointments(outlet_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_outlet_date_time ON appointments(outlet_id, date, time);
CREATE INDEX IF NOT EXISTS idx_appointments_outlet_staff_date ON appointments(outlet_id, staff_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_outlet_client ON appointments(outlet_id, client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_outlet_client_date ON appointments(outlet_id, client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_outlet_status ON appointments(outlet_id, status);

-- Transactions (most critical for reports, dashboard, POS)
CREATE INDEX IF NOT EXISTS idx_transactions_outlet ON transactions(outlet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_outlet_date ON transactions(outlet_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_outlet_type_date ON transactions(outlet_id, type, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_outlet_client ON transactions(outlet_id, client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_outlet_client_type_date ON transactions(outlet_id, client_id, type, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_parent_sale ON transactions(parent_sale_id);

-- Vouchers
CREATE INDEX IF NOT EXISTS idx_vouchers_outlet ON vouchers(outlet_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_slug ON vouchers(slug);
CREATE INDEX IF NOT EXISTS idx_vouchers_redemption_id ON vouchers(redemption_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(outlet_id, status);

-- Point transactions
CREATE INDEX IF NOT EXISTS idx_point_transactions_client ON point_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_client_ts ON point_transactions(client_id, timestamp DESC);

-- Outstanding transactions
CREATE INDEX IF NOT EXISTS idx_outstanding_transactions_client ON outstanding_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_outstanding_transactions_client_ts ON outstanding_transactions(client_id, timestamp DESC);

-- Credit history
CREATE INDEX IF NOT EXISTS idx_credit_history_client ON credit_history(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_history_client_ts ON credit_history(client_id, timestamp DESC);

-- Points credits (idempotency)
-- PK already covers (client_id, sale_id)

-- Users
CREATE INDEX IF NOT EXISTS idx_users_outlet ON users(outlet_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Frontend customers
CREATE INDEX IF NOT EXISTS idx_frontend_customers_outlet ON frontend_customers(outlet_id);
CREATE INDEX IF NOT EXISTS idx_frontend_customers_email ON frontend_customers(email);
