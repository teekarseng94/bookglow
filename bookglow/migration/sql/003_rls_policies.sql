-- ============================================================
-- BookGlow: Firestore → Supabase Migration
-- 003_rls_policies.sql
--
-- Row Level Security policies for outlet-level data isolation.
-- Mirrors Firestore security rules: each user can only
-- read/write data belonging to their assigned outlet.
--
-- NOTE: During migration testing, you may want to temporarily
-- disable RLS. Enable it once you switch to Supabase auth.
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outstanding_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE frontend_customers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: Get current user's outlet_id from users table
-- Maps Firebase UID (stored in auth.uid()) to outlet_id
-- ============================================================

-- During migration phase: allow all authenticated users full access.
-- Replace these permissive policies with outlet-scoped ones
-- when you migrate auth to Supabase.

-- Outlets: authenticated users can read all outlets
CREATE POLICY "outlets_select_authenticated"
  ON outlets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "outlets_all_service_role"
  ON outlets FOR ALL
  TO service_role
  USING (true);

-- Users: users can read their own record
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  TO authenticated
  USING (uid = auth.uid()::text);

CREATE POLICY "users_all_service_role"
  ON users FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- For all outlet-scoped tables: service_role has full access,
-- authenticated users access only their outlet's data.
-- ============================================================

-- Macro: create outlet-scoped policies for a table
-- We use the users table to look up the current user's outlet_id

-- Clients
CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated
  WITH CHECK (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "clients_update" ON clients FOR UPDATE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "clients_delete" ON clients FOR DELETE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "clients_service_role" ON clients FOR ALL TO service_role USING (true);

-- Staff
CREATE POLICY "staff_select" ON staff FOR SELECT TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "staff_insert" ON staff FOR INSERT TO authenticated
  WITH CHECK (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "staff_update" ON staff FOR UPDATE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "staff_delete" ON staff FOR DELETE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "staff_service_role" ON staff FOR ALL TO service_role USING (true);

-- Services
CREATE POLICY "services_select" ON services FOR SELECT TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "services_insert" ON services FOR INSERT TO authenticated
  WITH CHECK (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "services_update" ON services FOR UPDATE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "services_delete" ON services FOR DELETE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "services_service_role" ON services FOR ALL TO service_role USING (true);

-- Products
CREATE POLICY "products_select" ON products FOR SELECT TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "products_insert" ON products FOR INSERT TO authenticated
  WITH CHECK (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "products_update" ON products FOR UPDATE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "products_delete" ON products FOR DELETE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "products_service_role" ON products FOR ALL TO service_role USING (true);

-- Packages
CREATE POLICY "packages_select" ON packages FOR SELECT TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "packages_insert" ON packages FOR INSERT TO authenticated
  WITH CHECK (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "packages_update" ON packages FOR UPDATE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "packages_delete" ON packages FOR DELETE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "packages_service_role" ON packages FOR ALL TO service_role USING (true);

-- Appointments
CREATE POLICY "appointments_select" ON appointments FOR SELECT TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "appointments_insert" ON appointments FOR INSERT TO authenticated
  WITH CHECK (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "appointments_update" ON appointments FOR UPDATE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "appointments_delete" ON appointments FOR DELETE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "appointments_service_role" ON appointments FOR ALL TO service_role USING (true);

-- Transactions
CREATE POLICY "transactions_select" ON transactions FOR SELECT TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "transactions_insert" ON transactions FOR INSERT TO authenticated
  WITH CHECK (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "transactions_update" ON transactions FOR UPDATE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "transactions_delete" ON transactions FOR DELETE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "transactions_service_role" ON transactions FOR ALL TO service_role USING (true);

-- Rewards
CREATE POLICY "rewards_select" ON rewards FOR SELECT TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "rewards_insert" ON rewards FOR INSERT TO authenticated
  WITH CHECK (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "rewards_update" ON rewards FOR UPDATE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "rewards_delete" ON rewards FOR DELETE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "rewards_service_role" ON rewards FOR ALL TO service_role USING (true);

-- Vouchers (public read for slug-based access; write restricted)
CREATE POLICY "vouchers_select" ON vouchers FOR SELECT TO authenticated USING (true);
CREATE POLICY "vouchers_select_anon" ON vouchers FOR SELECT TO anon USING (true);
CREATE POLICY "vouchers_insert" ON vouchers FOR INSERT TO authenticated
  WITH CHECK (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "vouchers_update" ON vouchers FOR UPDATE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "vouchers_delete" ON vouchers FOR DELETE TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "vouchers_service_role" ON vouchers FOR ALL TO service_role USING (true);

-- API Integrations
CREATE POLICY "api_integrations_select" ON api_integrations FOR SELECT TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "api_integrations_all" ON api_integrations FOR ALL TO service_role USING (true);

-- Point Transactions
CREATE POLICY "point_transactions_select" ON point_transactions FOR SELECT TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "point_transactions_insert" ON point_transactions FOR INSERT TO authenticated
  WITH CHECK (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "point_transactions_service_role" ON point_transactions FOR ALL TO service_role USING (true);

-- Outstanding Transactions
CREATE POLICY "outstanding_transactions_select" ON outstanding_transactions FOR SELECT TO authenticated
  USING (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "outstanding_transactions_insert" ON outstanding_transactions FOR INSERT TO authenticated
  WITH CHECK (outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text));
CREATE POLICY "outstanding_transactions_service_role" ON outstanding_transactions FOR ALL TO service_role USING (true);

-- Credit History
CREATE POLICY "credit_history_select" ON credit_history FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text)));
CREATE POLICY "credit_history_insert" ON credit_history FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text)));
CREATE POLICY "credit_history_service_role" ON credit_history FOR ALL TO service_role USING (true);

-- Points Credits
CREATE POLICY "points_credits_select" ON points_credits FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text)));
CREATE POLICY "points_credits_insert" ON points_credits FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE outlet_id IN (SELECT outlet_id FROM users WHERE uid = auth.uid()::text)));
CREATE POLICY "points_credits_service_role" ON points_credits FOR ALL TO service_role USING (true);

-- Frontend Customers (public read for booking; write via service_role)
CREATE POLICY "frontend_customers_select" ON frontend_customers FOR SELECT TO anon USING (true);
CREATE POLICY "frontend_customers_select_auth" ON frontend_customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "frontend_customers_service_role" ON frontend_customers FOR ALL TO service_role USING (true);
