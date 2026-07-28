-- Merchant portal Phase 2: CRM clients + ledger tables (points / outstanding / credit)
-- Extends clients columns; adds points_credits, point_transactions, outstanding_transactions, credit_history.
-- Merchant RLS via current_portal_outlet_id(); booking create_public_booking still uses SECURITY DEFINER.

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

-- Idempotency log for sale → points credit
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

-- Merchant CRUD on clients (booking RPC remains SECURITY DEFINER)
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

-- Ledger tables: outlet-scoped via join to clients or outlet_id
DROP POLICY IF EXISTS "points_credits_merchant_all" ON points_credits;
CREATE POLICY "points_credits_merchant_all"
  ON points_credits FOR ALL TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = points_credits.client_id
        AND c.outlet_id = public.current_portal_outlet_id()
    )
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = points_credits.client_id
        AND c.outlet_id = public.current_portal_outlet_id()
    )
  );

DROP POLICY IF EXISTS "point_transactions_merchant_all" ON point_transactions;
CREATE POLICY "point_transactions_merchant_all"
  ON point_transactions FOR ALL TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "outstanding_transactions_merchant_all" ON outstanding_transactions;
CREATE POLICY "outstanding_transactions_merchant_all"
  ON outstanding_transactions FOR ALL TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "credit_history_merchant_all" ON credit_history;
CREATE POLICY "credit_history_merchant_all"
  ON credit_history FOR ALL TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = credit_history.client_id
        AND c.outlet_id = public.current_portal_outlet_id()
    )
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = credit_history.client_id
        AND c.outlet_id = public.current_portal_outlet_id()
    )
  );

DROP POLICY IF EXISTS "points_credits_service_role" ON points_credits;
CREATE POLICY "points_credits_service_role" ON points_credits FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "point_transactions_service_role" ON point_transactions;
CREATE POLICY "point_transactions_service_role" ON point_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "outstanding_transactions_service_role" ON outstanding_transactions;
CREATE POLICY "outstanding_transactions_service_role" ON outstanding_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "credit_history_service_role" ON credit_history;
CREATE POLICY "credit_history_service_role" ON credit_history FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON points_credits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON point_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON outstanding_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON credit_history TO authenticated;

-- Atomic: credit points for a sale once
CREATE OR REPLACE FUNCTION public.merchant_credit_points_for_sale(
  p_client_id text,
  p_sale_id text,
  p_points integer,
  p_outlet_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outlet text;
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN
    RETURN false;
  END IF;

  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  SELECT outlet_id INTO v_outlet FROM clients WHERE id = p_client_id;
  IF v_outlet IS NULL OR v_outlet <> p_outlet_id THEN
    RAISE EXCEPTION 'Client not found for outlet.' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO points_credits (client_id, sale_id, points)
  VALUES (p_client_id, p_sale_id, p_points)
  ON CONFLICT (client_id, sale_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE clients SET points = COALESCE(points, 0) + p_points WHERE id = p_client_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_credit_points_for_sale(text, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_credit_points_for_sale(text, text, integer, text) TO authenticated;

-- Atomic: adjust points + log (Topup / Redeem / Deduction)
CREATE OR REPLACE FUNCTION public.merchant_adjust_client_points(
  p_client_id text,
  p_outlet_id text,
  p_type text,
  p_amount numeric,
  p_is_manual boolean DEFAULT true,
  p_description text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outlet text;
  v_prev integer;
  v_new integer;
  v_delta integer;
  v_id text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  SELECT outlet_id, COALESCE(points, 0) INTO v_outlet, v_prev
  FROM clients WHERE id = p_client_id FOR UPDATE;

  IF v_outlet IS NULL OR v_outlet <> p_outlet_id THEN
    RAISE EXCEPTION 'Client not found for outlet.' USING ERRCODE = 'P0002';
  END IF;

  IF lower(p_type) LIKE 'topup%' OR p_type = 'Topup' THEN
    v_delta := p_amount::integer;
  ELSE
    v_delta := -p_amount::integer;
  END IF;

  v_new := GREATEST(0, v_prev + v_delta);
  UPDATE clients SET points = v_new WHERE id = p_client_id;

  v_id := replace(gen_random_uuid()::text, '-', '');
  INSERT INTO point_transactions (
    id, client_id, outlet_id, type, amount, previous_balance, new_balance,
    timestamp, is_manual, description
  ) VALUES (
    v_id, p_client_id, p_outlet_id, p_type, p_amount, v_prev, v_new,
    now(), COALESCE(p_is_manual, true), p_description
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_adjust_client_points(text, text, text, numeric, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_adjust_client_points(text, text, text, numeric, boolean, text) TO authenticated;

-- Atomic: adjust outstanding + log
CREATE OR REPLACE FUNCTION public.merchant_adjust_client_outstanding(
  p_client_id text,
  p_outlet_id text,
  p_type text,
  p_amount numeric,
  p_timestamp timestamptz DEFAULT now()
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outlet text;
  v_prev numeric;
  v_new numeric;
  v_delta numeric;
  v_id text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  SELECT outlet_id, COALESCE(outstanding, 0) INTO v_outlet, v_prev
  FROM clients WHERE id = p_client_id FOR UPDATE;

  IF v_outlet IS NULL OR v_outlet <> p_outlet_id THEN
    RAISE EXCEPTION 'Client not found for outlet.' USING ERRCODE = 'P0002';
  END IF;

  IF p_type = 'Add' THEN
    v_delta := p_amount;
  ELSE
    v_delta := -p_amount;
  END IF;

  v_new := GREATEST(0, v_prev + v_delta);
  UPDATE clients SET outstanding = v_new WHERE id = p_client_id;

  v_id := replace(gen_random_uuid()::text, '-', '');
  INSERT INTO outstanding_transactions (
    id, client_id, outlet_id, type, amount, previous_balance, new_balance,
    timestamp, is_manual
  ) VALUES (
    v_id, p_client_id, p_outlet_id, p_type, p_amount, v_prev, v_new,
    COALESCE(p_timestamp, now()), true
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_adjust_client_outstanding(text, text, text, numeric, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_adjust_client_outstanding(text, text, text, numeric, timestamptz) TO authenticated;

-- Atomic: adjust credit wallet + log (applied remotely as merchant_adjust_client_credit)
CREATE OR REPLACE FUNCTION public.merchant_adjust_client_credit(
  p_client_id text,
  p_outlet_id text,
  p_type text,
  p_amount numeric,
  p_staff_remark text DEFAULT NULL,
  p_staff_name text DEFAULT NULL,
  p_transaction_id text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outlet text;
  v_prev numeric;
  v_new numeric;
  v_delta numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  SELECT outlet_id, COALESCE(credit, 0) INTO v_outlet, v_prev
  FROM clients WHERE id = p_client_id FOR UPDATE;

  IF v_outlet IS NULL OR v_outlet <> p_outlet_id THEN
    RAISE EXCEPTION 'Client not found for outlet.' USING ERRCODE = 'P0002';
  END IF;

  IF lower(p_type) = 'topup' THEN
    v_delta := p_amount;
  ELSE
    v_delta := -p_amount;
  END IF;

  v_new := v_prev + v_delta;
  IF v_new < 0 THEN
    RAISE EXCEPTION 'Insufficient credit balance.' USING ERRCODE = '22023';
  END IF;

  UPDATE clients SET credit = v_new WHERE id = p_client_id;

  INSERT INTO credit_history (
    id, client_id, outlet_id, type, amount, new_balance,
    staff_remark, staff_name, timestamp, transaction_id
  ) VALUES (
    replace(gen_random_uuid()::text, '-', ''),
    p_client_id, p_outlet_id, p_type, p_amount, v_new,
    COALESCE(NULLIF(btrim(p_staff_remark), ''), CASE WHEN lower(p_type) = 'topup' THEN 'Top up' ELSE 'Deduction' END),
    p_staff_name,
    now(),
    p_transaction_id
  );

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_adjust_client_credit(text, text, text, numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_adjust_client_credit(text, text, text, numeric, text, text, text) TO authenticated;
