ALTER TABLE clients ADD COLUMN IF NOT EXISTS voucher_count INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit NUMERIC(12,2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS outstanding NUMERIC(12,2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birthday TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ic TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS marital TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tag TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ethnic TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS member_tier TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_import_id TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_outlet ON clients (outlet_id);
CREATE INDEX IF NOT EXISTS idx_clients_outlet_import ON clients (outlet_id, last_import_id);

CREATE TABLE IF NOT EXISTS points_credits (
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sale_id TEXT NOT NULL,
  points INTEGER NOT NULL,
  credited_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (client_id, sale_id)
);

CREATE TABLE IF NOT EXISTS point_transactions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  type TEXT NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  previous_balance NUMERIC(12,2) DEFAULT 0,
  new_balance NUMERIC(12,2) DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT now(),
  is_manual BOOLEAN DEFAULT false,
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_client
  ON point_transactions (client_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS outstanding_transactions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  type TEXT NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  previous_balance NUMERIC(12,2) DEFAULT 0,
  new_balance NUMERIC(12,2) DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT now(),
  is_manual BOOLEAN DEFAULT false,
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_outstanding_transactions_client
  ON outstanding_transactions (client_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS credit_history (
  id TEXT PRIMARY KEY DEFAULT replace(gen_random_uuid()::text, '-', ''),
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  outlet_id TEXT REFERENCES outlets(outlet_id),
  type TEXT NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  new_balance NUMERIC(12,2) DEFAULT 0,
  staff_remark TEXT,
  staff_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  transaction_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_credit_history_client
  ON credit_history (client_id, timestamp DESC);

ALTER TABLE points_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outstanding_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_merchant_select" ON clients;
CREATE POLICY "clients_merchant_select"
  ON clients FOR SELECT TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "clients_merchant_insert" ON clients;
CREATE POLICY "clients_merchant_insert"
  ON clients FOR INSERT TO authenticated
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "clients_merchant_update" ON clients;
CREATE POLICY "clients_merchant_update"
  ON clients FOR UPDATE TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "clients_merchant_delete" ON clients;
CREATE POLICY "clients_merchant_delete"
  ON clients FOR DELETE TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON clients TO authenticated;
