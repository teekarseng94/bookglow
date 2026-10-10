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
