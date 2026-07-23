-- Merchant portal Phase 3: transactions (POS/sales) + products/packages/rewards catalog
-- Cashier role: SALE only; admin: all transaction types.

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
  remarks TEXT,
  payment_status TEXT,
  outstanding NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_outlet_date ON transactions (outlet_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_outlet_type ON transactions (outlet_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_outlet_client ON transactions (outlet_id, client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_parent_sale ON transactions (parent_sale_id);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  name TEXT NOT NULL DEFAULT '',
  price NUMERIC(12,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  category TEXT DEFAULT '',
  fixed_commission_amount NUMERIC(12,2)
);

CREATE INDEX IF NOT EXISTS idx_products_outlet ON products (outlet_id);

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

CREATE INDEX IF NOT EXISTS idx_packages_outlet ON packages (outlet_id);

CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  name TEXT NOT NULL DEFAULT '',
  cost INTEGER DEFAULT 0,
  icon TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_rewards_outlet ON rewards (outlet_id);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

-- Transactions: outlet-scoped; cashiers limited to SALE
DROP POLICY IF EXISTS "transactions_merchant_select" ON transactions;
CREATE POLICY "transactions_merchant_select"
  ON transactions FOR SELECT TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR (
      outlet_id = public.current_portal_outlet_id()
      AND (public.is_portal_admin() OR type = 'SALE')
    )
  );

DROP POLICY IF EXISTS "transactions_merchant_insert" ON transactions;
CREATE POLICY "transactions_merchant_insert"
  ON transactions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_portal_platform_admin()
    OR (
      outlet_id = public.current_portal_outlet_id()
      AND (public.is_portal_admin() OR type = 'SALE')
    )
  );

DROP POLICY IF EXISTS "transactions_merchant_update" ON transactions;
CREATE POLICY "transactions_merchant_update"
  ON transactions FOR UPDATE TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR (
      outlet_id = public.current_portal_outlet_id()
      AND (public.is_portal_admin() OR type = 'SALE')
    )
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR (
      outlet_id = public.current_portal_outlet_id()
      AND (public.is_portal_admin() OR type = 'SALE')
    )
  );

DROP POLICY IF EXISTS "transactions_merchant_delete" ON transactions;
CREATE POLICY "transactions_merchant_delete"
  ON transactions FOR DELETE TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR (
      outlet_id = public.current_portal_outlet_id()
      AND (public.is_portal_admin() OR type = 'SALE')
    )
  );

DROP POLICY IF EXISTS "transactions_service_role" ON transactions;
CREATE POLICY "transactions_service_role"
  ON transactions FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO authenticated;

-- Catalog tables: full merchant CRUD for own outlet
DROP POLICY IF EXISTS "products_merchant_all" ON products;
CREATE POLICY "products_merchant_all"
  ON products FOR ALL TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "packages_merchant_all" ON packages;
CREATE POLICY "packages_merchant_all"
  ON packages FOR ALL TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "rewards_merchant_all" ON rewards;
CREATE POLICY "rewards_merchant_all"
  ON rewards FOR ALL TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "products_service_role" ON products;
CREATE POLICY "products_service_role" ON products FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "packages_service_role" ON packages;
CREATE POLICY "packages_service_role" ON packages FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "rewards_service_role" ON rewards;
CREATE POLICY "rewards_service_role" ON rewards FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rewards TO authenticated;
